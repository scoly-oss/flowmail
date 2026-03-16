import { requestLogin } from '../services/auth'

export function LoginScreen() {
  return (
    <div className="login-screen" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100vh', background: '#0a0a0f' }}>
      <div className="login-card" style={{ textAlign: 'center', padding: '48px' }}>
        <div className="login-logo" style={{ fontSize: '48px', fontWeight: 700, color: '#6366f1', marginBottom: '16px' }}>FM</div>
        <h1 style={{ fontSize: '32px', fontWeight: 600, color: '#e0e0f0', marginBottom: '8px' }}>FlowMail</h1>
        <p style={{ color: '#8888a0', marginBottom: '32px' }}>Un client mail rapide et minimaliste.</p>
        <button
          className="btn-primary"
          onClick={requestLogin}
          style={{ background: '#6366f1', color: 'white', fontWeight: 500, padding: '12px 32px', borderRadius: '8px', fontSize: '15px', border: 'none', cursor: 'pointer' }}
        >
          Se connecter avec Google
        </button>
        <div className="login-shortcuts" style={{ marginTop: '32px' }}>
          <span className="shortcut-hint" style={{ fontSize: '12px', color: '#666678' }}>
            Raccourcis : <kbd>j</kbd>/<kbd>k</kbd> naviguer &middot; <kbd>o</kbd> ouvrir &middot; <kbd>e</kbd> archiver &middot; <kbd>c</kbd> composer &middot; <kbd>/</kbd> rechercher
          </span>
        </div>
      </div>
    </div>
  )
}
