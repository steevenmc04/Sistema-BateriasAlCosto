/**
 * Valores que vienen de BIGINT / mysql2 como bigint o string deben ser número plano:
 * `jwt.sign` usa JSON.stringify y falla con BigInt ("Do not know how to serialize a BigInt").
 */
export function idUsuarioParaJwt(valor) {
  if (valor == null || valor === '') return null;
  if (typeof valor === 'bigint') return Number(valor);
  const n = Number(valor);
  if (!Number.isFinite(n) || n <= 0) return null;
  return Math.floor(n);
}
