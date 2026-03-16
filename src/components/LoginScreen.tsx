import { requestLogin } from '../services/auth'

export function LoginScreen() {
  return (
    <div className="login-screen">
      <div className="login-card">
        <div className="login-logo">FM</div>
        <h1>FlowMail</h1>
        <p>Un client mail rapide et minimaliste.</p>
        <button className="btn-primary" onClick={requestLogin}>
          Se connecter avec Google
        </button>
        <div className="login-shortcuts">
          <span className="shortcut-hint">Raccourcis : <kbd>j</kbd>/<kbd>k</kbd> naviguer &middot; <kbd>o</kbd> ouvrir &middot; <kbd>e</kbd> archiver &middot; <kbd>c</kbd> composer &middot; <kbd>/</kbd> rechercher</span>
        </div>
      </div>
    </div>
  )
}
