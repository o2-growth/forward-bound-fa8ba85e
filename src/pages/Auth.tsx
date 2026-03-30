import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { z } from 'zod';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useAuth } from '@/hooks/useAuth';
import { supabase } from '@/integrations/supabase/client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { useToast } from '@/hooks/use-toast';
import { Loader2, LogIn, UserPlus, KeyRound, ArrowLeft, Eye, EyeOff } from 'lucide-react';
import { O2Logo } from '@/components/O2Logo';

const loginSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
});

const signupSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
});

const forgotPasswordSchema = z.object({
  email: z.string().trim().email('Email inválido').max(255, 'Email muito longo'),
});

const resetPasswordSchema = z.object({
  password: z.string().min(6, 'Senha deve ter pelo menos 6 caracteres').max(100, 'Senha muito longa'),
  confirmPassword: z.string(),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'Senhas não conferem',
  path: ['confirmPassword'],
});

type LoginFormValues = z.infer<typeof loginSchema>;
type SignupFormValues = z.infer<typeof signupSchema>;
type ForgotPasswordFormValues = z.infer<typeof forgotPasswordSchema>;
type ResetPasswordFormValues = z.infer<typeof resetPasswordSchema>;

type AuthMode = 'login' | 'signup' | 'forgot' | 'reset';

export default function Auth() {
  const [searchParams] = useSearchParams();
  const initialMode = searchParams.get('mode') === 'reset' ? 'reset' : 'login';
  const [mode, setMode] = useState<AuthMode>(initialMode);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showLoginPassword, setShowLoginPassword] = useState(false);
  const [showSignupPassword, setShowSignupPassword] = useState(false);
  const [showResetPassword, setShowResetPassword] = useState(false);
  const [showResetConfirmPassword, setShowResetConfirmPassword] = useState(false);
  const [isProcessingRecovery, setIsProcessingRecovery] = useState(false);
  const [recoveryError, setRecoveryError] = useState<string | null>(null);
  const { user, signIn, signUp, resetPassword, updatePassword } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // Processa tokens de recovery do hash fragment
  useEffect(() => {
    const hashParams = new URLSearchParams(window.location.hash.substring(1));
    const accessToken = hashParams.get('access_token');
    const refreshToken = hashParams.get('refresh_token');
    const type = hashParams.get('type');
    
    if (type === 'recovery' && accessToken && refreshToken) {
      setIsProcessingRecovery(true);
      setMode('reset');
      setRecoveryError(null);
      
      // Aguarda o SDK processar os tokens automaticamente
      supabase.auth.getSession().then(({ data: { session }, error }) => {
        setIsProcessingRecovery(false);
        if (error || !session) {
          setRecoveryError('Link de recuperação inválido ou expirado. Solicite um novo link.');
          setMode('forgot');
        }
        // Limpa o hash da URL para evitar reprocessamento
        window.history.replaceState(null, '', '/auth?mode=reset');
      });
    }
  }, []);

  useEffect(() => {
    if (user && mode !== 'reset') {
      navigate('/', { replace: true });
    }
  }, [user, navigate, mode]);

  const loginForm = useForm<LoginFormValues>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const signupForm = useForm<SignupFormValues>({
    resolver: zodResolver(signupSchema),
    defaultValues: { email: '', password: '' },
  });

  const forgotPasswordForm = useForm<ForgotPasswordFormValues>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: '' },
  });

  const resetPasswordForm = useForm<ResetPasswordFormValues>({
    resolver: zodResolver(resetPasswordSchema),
    defaultValues: { password: '', confirmPassword: '' },
  });

  const handleLogin = async (values: LoginFormValues) => {
    setIsSubmitting(true);
    const { error } = await signIn(values.email, values.password);
    setIsSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao entrar',
        description: error.message === 'Invalid login credentials' 
          ? 'Email ou senha incorretos' 
          : error.message,
      });
    }
  };

  const handleSignup = async (values: SignupFormValues) => {
    setIsSubmitting(true);
    const { error } = await signUp(values.email, values.password, '');
    setIsSubmitting(false);

    if (error) {
      let message = error.message;
      if (error.message.includes('already registered')) {
        message = 'Este email já está cadastrado';
      }
      toast({
        variant: 'destructive',
        title: 'Erro ao cadastrar',
        description: message,
      });
    } else {
      toast({
        title: 'Conta criada!',
        description: 'Você foi conectado automaticamente.',
      });
    }
  };

  const handleForgotPassword = async (values: ForgotPasswordFormValues) => {
    setIsSubmitting(true);
    const { error } = await resetPassword(values.email);
    setIsSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao enviar email',
        description: error.message,
      });
    } else {
      toast({
        title: 'Email enviado!',
        description: 'Verifique sua caixa de entrada para redefinir sua senha.',
      });
      setMode('login');
    }
  };

  const handleResetPassword = async (values: ResetPasswordFormValues) => {
    // Verifica se há sessão ativa (necessário para updateUser)
    const { data: { session } } = await supabase.auth.getSession();
    if (!session) {
      toast({
        variant: 'destructive',
        title: 'Sessão expirada',
        description: 'Solicite um novo link de recuperação de senha.',
      });
      setMode('forgot');
      return;
    }

    setIsSubmitting(true);
    const { error } = await updatePassword(values.password);
    setIsSubmitting(false);

    if (error) {
      toast({
        variant: 'destructive',
        title: 'Erro ao redefinir senha',
        description: error.message,
      });
    } else {
      toast({
        title: 'Senha redefinida!',
        description: 'Sua senha foi atualizada com sucesso.',
      });
      navigate('/', { replace: true });
    }
  };

  const renderForm = () => {
    switch (mode) {
      case 'forgot':
        return (
          <Form {...forgotPasswordForm}>
            <form onSubmit={forgotPasswordForm.handleSubmit(handleForgotPassword)} className="space-y-4">
              <FormField
                control={forgotPasswordForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                Enviar link de recuperação
              </Button>
              <Button
                type="button"
                variant="ghost"
                className="w-full"
                onClick={() => setMode('login')}
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Voltar ao login
              </Button>
            </form>
          </Form>
        );

      case 'reset':
        return (
          <Form {...resetPasswordForm}>
            <form onSubmit={resetPasswordForm.handleSubmit(handleResetPassword)} className="space-y-4">
              <FormField
                control={resetPasswordForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nova senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showResetPassword ? "text" : "password"} placeholder="••••••" {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowResetPassword(!showResetPassword)}
                        >
                          {showResetPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={resetPasswordForm.control}
                name="confirmPassword"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Confirmar nova senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showResetConfirmPassword ? "text" : "password"} placeholder="••••••" {...field} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowResetConfirmPassword(!showResetConfirmPassword)}
                        >
                          {showResetConfirmPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <KeyRound className="h-4 w-4 mr-2" />
                )}
                Redefinir senha
              </Button>
            </form>
          </Form>
        );

      case 'signup':
        return (
          <Form {...signupForm}>
            <form onSubmit={signupForm.handleSubmit(handleSignup)} className="space-y-4">
              <FormField
                control={signupForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" autoComplete="email" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={signupForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showSignupPassword ? "text" : "password"} placeholder="••••••" autoComplete="new-password" {...field} value={field.value ?? ''} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowSignupPassword(!showSignupPassword)}
                        >
                          {showSignupPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <UserPlus className="h-4 w-4 mr-2" />
                )}
                Cadastrar
              </Button>
            </form>
          </Form>
        );

      default: // login
        return (
          <Form {...loginForm}>
            <form onSubmit={loginForm.handleSubmit(handleLogin)} className="space-y-4">
              <FormField
                control={loginForm.control}
                name="email"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Email</FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="seu@email.com" autoComplete="email" {...field} value={field.value ?? ''} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={loginForm.control}
                name="password"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Senha</FormLabel>
                    <FormControl>
                      <div className="relative">
                        <Input type={showLoginPassword ? "text" : "password"} placeholder="••••••" autoComplete="current-password" {...field} value={field.value ?? ''} />
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="absolute right-0 top-0 h-full px-3 hover:bg-transparent"
                          onClick={() => setShowLoginPassword(!showLoginPassword)}
                        >
                          {showLoginPassword ? (
                            <EyeOff className="h-4 w-4 text-muted-foreground" />
                          ) : (
                            <Eye className="h-4 w-4 text-muted-foreground" />
                          )}
                        </Button>
                      </div>
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <Button type="submit" className="w-full" disabled={isSubmitting}>
                {isSubmitting ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <LogIn className="h-4 w-4 mr-2" />
                )}
                Entrar
              </Button>
              <Button
                type="button"
                variant="link"
                className="w-full text-muted-foreground"
                onClick={() => setMode('forgot')}
              >
                Esqueci minha senha
              </Button>
            </form>
          </Form>
        );
    }
  };

  const getTitle = () => {
    switch (mode) {
      case 'forgot': return 'Recuperar senha';
      case 'reset': return 'Redefinir senha';
      case 'signup': return 'Criar conta';
      default: return 'Planejamento Estratégico';
    }
  };

  const getDescription = () => {
    switch (mode) {
      case 'forgot': return 'Digite seu email para receber o link de recuperação';
      case 'reset': return 'Digite sua nova senha';
      case 'signup': return 'Crie sua conta';
      default: return 'Entre com sua conta';
    }
  };

  // Loading state para processamento de recovery
  if (isProcessingRecovery) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background p-4">
        <Card className="w-full max-w-md">
          <CardContent className="pt-6 text-center">
            <Loader2 className="h-8 w-8 animate-spin mx-auto mb-4 text-primary" />
            <p className="text-muted-foreground">Processando link de recuperação...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-background p-4">
      <div className="mb-8" style={{ filter: 'drop-shadow(0 0 40px rgba(99,241,97,0.15))' }}>
        <O2Logo height={48} />
      </div>
      <Card className="w-full max-w-md border-primary/20 card-glow">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-display text-gradient">
            {getTitle()}
          </CardTitle>
          <CardDescription>
            {getDescription()}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {recoveryError && (
            <div className="mb-4 p-3 bg-destructive/10 border border-destructive/20 rounded-md text-sm text-destructive">
              {recoveryError}
            </div>
          )}
          {renderForm()}

          {(mode === 'login' || mode === 'signup') && (
            <div className="mt-4 text-center">
              <Button
                variant="link"
                onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
                className="text-muted-foreground"
              >
                {mode === 'login' ? 'Não tem conta? Cadastre-se' : 'Já tem conta? Entre'}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}