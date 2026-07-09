// Regra pontual: em Julho/2026 (e SOMENTE nesse mês), quando o mesmo card
// tem ocorrências de "Contrato assinado" e "Ganho" no mesmo mês, o dedup
// preserva a linha de "Contrato assinado". Fora de Jul/26 a preferência
// segue a regra global (prefere "Ganho").
//
// Gate por data efetiva da ocorrência — não usa data atual nem período do
// filtro. Mudança é local ao mês: não afeta Jun/26, Ago/26 nem qualquer
// outro mês/ano.
export function preferContratoAssinado(effectiveDate: Date): boolean {
  return effectiveDate.getFullYear() === 2026 && effectiveDate.getMonth() === 6; // Jul (0-indexed)
}
