import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { HashRouter } from 'react-router-dom'
import { AuthGuard } from 'lemma-sdk/react'
import { client } from './lib/lemma'
import { AccessRequestScreen } from './components/AccessRequestScreen'
import App from './App.tsx'
import './index.css'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <AuthGuard client={client} accessRequestFallback={<AccessRequestScreen />}>
      <HashRouter>
        <App />
      </HashRouter>
    </AuthGuard>
  </StrictMode>,
)
