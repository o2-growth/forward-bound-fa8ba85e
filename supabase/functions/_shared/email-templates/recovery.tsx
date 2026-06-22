/// <reference types="npm:@types/react@18.3.1" />

import * as React from 'npm:react@18.3.1'

import {
  Body,
  Button,
  Container,
  Head,
  Heading,
  Hr,
  Html,
  Preview,
  Text,
} from 'npm:@react-email/components@0.0.22'

interface RecoveryEmailProps {
  siteName: string
  recipient?: string
  confirmationUrl: string
}

export const RecoveryEmail = ({
  siteName,
  recipient,
  confirmationUrl,
}: RecoveryEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Solicitação de redefinição de senha do seu acesso ao {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Redefinição de senha</Heading>
        <Text style={text}>Olá{recipient ? `, ${recipient}` : ''},</Text>
        <Text style={text}>
          Recebemos uma solicitação para redefinir a senha da sua conta no{' '}
          <strong>{siteName}</strong>, a plataforma interna da O2 Inc. Para
          continuar, clique no botão abaixo e escolha uma nova senha.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Redefinir minha senha
        </Button>
        <Text style={textSmall}>
          Caso o botão acima não funcione, copie e cole o link abaixo no seu
          navegador:
        </Text>
        <Text style={linkFallback}>{confirmationUrl}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Por segurança, este link expira em 1 hora e só pode ser usado uma
          única vez. Se você <strong>não</strong> solicitou esta alteração,
          pode ignorar este e-mail com tranquilidade — sua senha atual continua
          válida e nenhuma ação adicional é necessária.
        </Text>
        <Text style={footer}>
          Em caso de dúvidas, responda diretamente a este e-mail ou fale com a
          equipe de TI da O2.
        </Text>
        <Text style={signature}>
          Equipe O2 Inc.<br />
          Este é um e-mail automático enviado por notify.o2inc.com.br
        </Text>
      </Container>
    </Body>
  </Html>
)

export default RecoveryEmail

const main = { backgroundColor: '#ffffff', fontFamily: 'Inter, Arial, sans-serif' }
const container = { padding: '32px 28px', maxWidth: '560px' }
const h1 = {
  fontSize: '22px',
  fontWeight: 'bold' as const,
  color: '#0a0a0a',
  margin: '0 0 24px',
}
const text = {
  fontSize: '14px',
  color: '#3f3f46',
  lineHeight: '1.6',
  margin: '0 0 18px',
}
const textSmall = {
  fontSize: '13px',
  color: '#52525b',
  lineHeight: '1.6',
  margin: '24px 0 8px',
}
const button = {
  backgroundColor: '#0a0a0a',
  color: '#ffffff',
  fontSize: '14px',
  fontWeight: '600' as const,
  borderRadius: '8px',
  padding: '12px 22px',
  textDecoration: 'none',
  display: 'inline-block',
  margin: '6px 0 8px',
}
const linkFallback = {
  fontSize: '12px',
  color: '#3f3f46',
  wordBreak: 'break-all' as const,
  margin: '0 0 8px',
}
const hr = { borderColor: '#e4e4e7', margin: '28px 0' }
const footer = { fontSize: '12px', color: '#71717a', margin: '0 0 14px', lineHeight: '1.6' }
const signature = { fontSize: '11px', color: '#a1a1aa', margin: '20px 0 0', lineHeight: '1.5' }
