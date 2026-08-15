import { SignIn } from '@clerk/nextjs'

export default function SignInPage() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="text-center space-y-6">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold">NebulaSEO SEO</h1>
          <p className="text-muted-foreground">Sign in with your authorized Google account</p>
        </div>
        <SignIn
          routing="path"
          path="/sign-in"
          signUpUrl=""
          appearance={{
            elements: {
              rootBox: 'mx-auto',
              card: 'shadow-lg',
              footerAction: { display: 'none' },
              socialButtonsBlockButton: 'font-medium',
            },
          }}
        />
      </div>
    </div>
  )
}
