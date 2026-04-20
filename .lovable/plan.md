

Corrigir o campo de email da tela “Recuperar senha” para que o texto digitado não suma nem pareça “não entrar”.

### O que vou ajustar
1. Revisar `src/pages/Auth.tsx` e padronizar o binding do formulário de recuperação:
   - garantir `value={field.value ?? ''}`
   - passar `onChange`, `onBlur`, `name` e `ref` do `react-hook-form` diretamente para o `Input`
   - evitar qualquer reset implícito no campo durante re-render

2. Ajustar a estrutura dos campos dentro de `FormControl`:
   - hoje alguns campos usam `FormControl` envolvendo um `div` com `Input` + botão
   - vou reorganizar isso para o input continuar sendo o elemento principal do controle, evitando comportamento estranho de foco/ref

3. Eliminar a causa provável do comportamento de “digita e some”:
   - reduzir remounts desnecessários entre modos (`login`, `forgot`, `reset`, `signup`)
   - se necessário, separar melhor os formulários por modo para o campo de recuperação não herdar estado incorreto

4. Conferir consistência visual e funcional:
   - placeholder continua igual
   - validação “Email inválido” só aparece corretamente sem apagar o valor digitado
   - botão “Enviar link de recuperação” continua funcionando igual

### Arquivos envolvidos
- `src/pages/Auth.tsx`
- possivelmente `src/components/ui/form.tsx` se eu precisar alinhar o uso de `FormControl`

### Resultado esperado
- você consegue clicar no campo de email em “Recuperar senha”
- consegue digitar normalmente
- o valor permanece visível
- a validação não apaga o texto
- o campo não perde foco a cada tecla

### Validação depois da correção
Vou considerar a correção pronta quando este fluxo estiver estável:
1. abrir `/auth`
2. clicar em “Esqueci minha senha”
3. digitar um email completo
4. ver o texto permanecendo no input
5. enviar o formulário normalmente

### Observação técnica
Pelos sinais atuais, o problema não parece ser de backend nem de envio de email. Está com cara de problema de renderização/binding do campo no frontend da tela de autenticação.

