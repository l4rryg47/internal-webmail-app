export function jsonError(code: string, message: string, status = 400) {
  return Response.json({ error: { code, message } }, { status });
}

export function successResponse<T>(data: T, status = 200) {
  return Response.json(data, { status });
}
