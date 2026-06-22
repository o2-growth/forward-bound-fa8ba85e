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

interface SignupEmailProps {
  siteName: string
  siteUrl: string
  recipient: string
  confirmationUrl: string
}

export const SignupEmail = ({
  siteName,
  recipient,
  confirmationUrl,
}: SignupEmailProps) => (
  <Html lang="pt-BR" dir="ltr">
    <Head />
    <Preview>Confirme seu e-mail para ativar seu acesso ao {siteName}</Preview>
    <Body style={main}>
      <Container style={container}>
        <Heading style={h1}>Confirme seu e-mail</Heading>
        <Text style={text}>Olá{recipient ? `, ${recipient}` : ''},</Text>
        <Text style={text}>
          Recebemos uma solicitação de cadastro no <strong>{siteName}</strong>,
          a plataforma interna da O2 Inc. Para concluir a ativação do seu
          acesso, confirme que este endereço de e-mail é seu clicando no botão
          abaixo.
        </Text>
        <Button style={button} href={confirmationUrl}>
          Confirmar meu e-mail
        </Button>
        <Text style={textSmall}>
          Caso o botão acima não funcione, copie e cole o link abaixo no seu
          navegador:
        </Text>
        <Text style={linkFallback}>{confirmationUrl}</Text>
        <Hr style={hr} />
        <Text style={footer}>
          Se você não solicitou este cadastro, ignore este e-mail — nenhuma
          conta será criada sem a confirmação.
        </Text>
        <Text style={signature}>
          Equipe O2 Inc.<br />
          Este é um e-mail automático enviado por notify.o2inc.com.br
        </Text>
      </Container>
    </Body>
  </Html>
)

export default SignupEmail

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
