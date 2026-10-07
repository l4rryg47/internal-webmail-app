"use client";

import { useEffect, useState } from "react";

interface MailPulseCountdownProps {
  nextSendAt: string;
  lastSentAt: string | null;
}

function formatRemaining(milliseconds: number) {
  const secondsRemaining = Math.max(0, Math.floor(milliseconds / 1000));
  const days = Math.floor(secondsRemaining / 86400);
  const hours = Math.floor((secondsRemaining % 86400) / 3600);
  const minutes = Math.floor((secondsRemaining % 3600) / 60);
  const seconds = secondsRemaining % 60;
  return { days, hours, minutes, seconds };
}

export function MailPulseCountdown({ nextSendAt, lastSentAt }: MailPulseCountdownProps) {
  const [now, setNow] = useState<number | null>(null);
  const [schedule, setSchedule] = useState({ nextSendAt, lastSentAt });
  const dueAt = new Date(schedule.nextSendAt).getTime();
  const remaining = now === null ? null : formatRemaining(dueAt - now);
  const scheduleIsDue = now !== null && now >= dueAt;

  useEffect(() => {
    const update = () => setNow(Date.now());
    update();
    const timer = window.setInterval(update, 1000);
    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (!scheduleIsDue) return;

    let active = true;
    const refreshSchedule = async () => {
      try {
        const response = await fetch("/api/admin/mail-pulse");
        if (!response.ok) {
          throw new Error(`Schedule refresh failed: ${response.status}`);
        }
        const refreshed = await response.json();
        if (active) {
          setSchedule({
            nextSendAt: refreshed.nextSendAt,
            lastSentAt: refreshed.lastSentAt,
          });
        }
      } catch (error) {
        console.error("Failed to refresh mail pulse schedule:", error);
      }
    };

    void refreshSchedule();
    const timer = window.setInterval(refreshSchedule, 30 * 60 * 1000);
    return () => {
      active = false;
      window.clearInterval(timer);
    };
  }, [dueAt, scheduleIsDue]);

  const countdownReachedZero = remaining !== null &&
    remaining.days === 0 &&
    remaining.hours === 0 &&
    remaining.minutes === 0 &&
    remaining.seconds === 0;

  return (
    <section className="panel mail-pulse-card">
      <div className="mail-pulse-heading">
        <div>
          <p className="mail-pulse-eyebrow">Automated inbox heartbeat</p>
          <h2>Mail Pulse</h2>
        </div>
        <span className="mail-pulse-status">Every 6 days</span>
      </div>
      <p className="mail-pulse-copy">
        A test message will be sent to admin@llctuar.com when the countdown ends.
      </p>
      <div className="mail-pulse-countdown" aria-label="Time until the next mail pulse">
        <div><strong>{remaining?.days ?? "--"}</strong><span>days</span></div>
        <div><strong>{remaining ? String(remaining.hours).padStart(2, "0") : "--"}</strong><span>hours</span></div>
        <div><strong>{remaining ? String(remaining.minutes).padStart(2, "0") : "--"}</strong><span>minutes</span></div>
        <div><strong>{remaining ? String(remaining.seconds).padStart(2, "0") : "--"}</strong><span>seconds</span></div>
      </div>
      <p className="mail-pulse-note">
        {countdownReachedZero
          ? "Countdown complete — awaiting the next scheduled delivery check."
          : `Next scheduled for ${new Date(schedule.nextSendAt).toLocaleString()}.`}
        {schedule.lastSentAt && ` Last sent ${new Date(schedule.lastSentAt).toLocaleString()}.`}
      </p>
    </section>
  );
}
