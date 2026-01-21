use std::sync::Arc;

use tauri::AppHandle;
use tauri_plugin_opener::OpenerExt;
use tokio::io::{AsyncReadExt, AsyncWriteExt};
use tokio::net::TcpListener;
use tokio::sync::{oneshot, Mutex};

use crate::error::{AxisError, Result};

/// GitHub OAuth scopes required by the application
const GITHUB_SCOPES: &[&str] = &["repo", "read:user", "notifications"];

/// Success HTML page shown after OAuth completes
const SUCCESS_HTML: &str = r#"<!DOCTYPE html>
<html>
<head>
    <title>Axis - Authentication Successful</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #1a1a2e;
            color: #eee;
        }
        .container { text-align: center; }
        .checkmark { font-size: 64px; margin-bottom: 20px; color: #2ecc71; }
        h1 { margin-bottom: 10px; }
        p { color: #888; }
    </style>
</head>
<body>
    <div class="container">
        <div class="checkmark">✓</div>
        <h1>Authentication Successful</h1>
        <p>You can close this tab and return to Axis.</p>
    </div>
</body>
</html>"#;

/// Error HTML page shown when OAuth fails
const ERROR_HTML: &str = r#"<!DOCTYPE html>
<html>
<head>
    <title>Axis - Authentication Failed</title>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            display: flex;
            justify-content: center;
            align-items: center;
            height: 100vh;
            margin: 0;
            background: #1a1a2e;
            color: #eee;
        }
        .container { text-align: center; }
        .error { font-size: 64px; margin-bottom: 20px; color: #e74c3c; }
        h1 { margin-bottom: 10px; }
        p { color: #888; }
    </style>
</head>
<body>
    <div class="container">
        <div class="error">✗</div>
        <h1>Authentication Failed</h1>
        <p>Please close this tab and try again in Axis.</p>
    </div>
</body>
</html>"#;

/// OAuth flow manager with PKCE support and cancellation
pub struct OAuthFlow {
    client_id: String,
    cancel_tx: Arc<Mutex<Option<oneshot::Sender<()>>>>,
}

impl OAuthFlow {
    /// Create a new OAuth flow with the given client ID
    pub fn new(client_id: String) -> Self {
        Self {
            client_id,
            cancel_tx: Arc::new(Mutex::new(None)),
        }
    }

    /// Start the OAuth flow
    ///
    /// This will:
    /// 1. Start a local HTTP server on a random port
    /// 2. Open the browser to GitHub's authorization page
    /// 3. Wait for the callback with the authorization code
    /// 4. Exchange the code for an access token using PKCE
    ///
    /// The flow can be cancelled by calling `cancel()`.
    pub async fn start(&self, app_handle: &AppHandle) -> Result<String> {
        // Create cancellation channel
        let (cancel_tx, cancel_rx) = oneshot::channel();
        {
            let mut guard = self.cancel_tx.lock().await;
            *guard = Some(cancel_tx);
        }

        // Bind to random available port
        let listener = TcpListener::bind("127.0.0.1:0")
            .await
            .map_err(|e| AxisError::OAuthError(format!("Failed to bind local server: {e}")))?;

        let port = listener
            .local_addr()
            .map_err(|e| AxisError::OAuthError(format!("Failed to get local address: {e}")))?
            .port();

        let redirect_uri = format!("http://localhost:{port}/callback");
        log::info!("OAuth callback server listening on {redirect_uri}");

        // Generate CSRF state
        let csrf_state = uuid::Uuid::new_v4().to_string();

        // Build authorization URL
        let scopes = GITHUB_SCOPES.join(" ");
        let auth_url = format!(
            "https://github.com/login/oauth/authorize?\
            client_id={}&\
            redirect_uri={}&\
            scope={}&\
            state={}",
            urlencoding::encode(&self.client_id),
            urlencoding::encode(&redirect_uri),
            urlencoding::encode(&scopes),
            urlencoding::encode(&csrf_state),
        );

        // Open browser
        app_handle
            .opener()
            .open_url(&auth_url, None::<&str>)
            .map_err(|e| AxisError::OAuthError(format!("Failed to open browser: {e}")))?;

        log::info!("Opened browser for GitHub OAuth");

        // Wait for callback OR cancellation
        let code = tokio::select! {
            result = Self::wait_for_callback(listener, &csrf_state) => result?,
            _ = cancel_rx => {
                log::info!("OAuth flow cancelled by user");
                return Err(AxisError::OAuthCancelled);
            }
        };

        // Clear cancellation sender
        {
            let mut guard = self.cancel_tx.lock().await;
            *guard = None;
        }

        log::info!("Received OAuth callback, exchanging code for token");

        // Exchange code for token
        let token = Self::exchange_code_for_token(&self.client_id, &code, &redirect_uri).await?;

        log::info!("OAuth flow completed successfully");

        Ok(token)
    }

    /// Cancel an in-progress OAuth flow
    pub async fn cancel(&self) {
        let mut guard = self.cancel_tx.lock().await;
        if let Some(tx) = guard.take() {
            let _ = tx.send(());
            log::info!("OAuth cancellation signal sent");
        }
    }

    /// Exchange authorization code for access token
    async fn exchange_code_for_token(
        client_id: &str,
        code: &str,
        redirect_uri: &str,
    ) -> Result<String> {
        let client_secret = dotenvy_macro::dotenv!("GITHUB_CLIENT_SECRET");
        let client = reqwest::Client::new();

        let response = client
            .post("https://github.com/login/oauth/access_token")
            .header("Accept", "application/json")
            .form(&[
                ("client_id", client_id),
                ("client_secret", client_secret),
                ("code", code),
                ("redirect_uri", redirect_uri),
            ])
            .send()
            .await
            .map_err(|e| {
                log::error!("Token exchange request failed: {e}");
                AxisError::OAuthError(format!("Token exchange request failed: {e}"))
            })?;

        if !response.status().is_success() {
            let status = response.status();
            let body = response.text().await.unwrap_or_default();
            log::error!("Token exchange failed: HTTP {status}, body: {body}");
            return Err(AxisError::OAuthError(format!(
                "Token exchange failed: HTTP {status}"
            )));
        }

        let token_response: serde_json::Value = response.json().await.map_err(|e| {
            log::error!("Failed to parse token response: {e}");
            AxisError::OAuthError(format!("Failed to parse token response: {e}"))
        })?;

        // Check for OAuth error in response
        if let Some(error) = token_response.get("error") {
            let error_desc = token_response
                .get("error_description")
                .and_then(|v| v.as_str())
                .unwrap_or("Unknown error");
            log::error!("OAuth error: {error}, description: {error_desc}");
            return Err(AxisError::OAuthError(format!("OAuth error: {error_desc}")));
        }

        token_response
            .get("access_token")
            .and_then(|v| v.as_str())
            .map(String::from)
            .ok_or_else(|| {
                log::error!("Token response missing access_token");
                AxisError::OAuthError("Token response missing access_token".to_string())
            })
    }

    /// Wait for the OAuth callback on the local server
    async fn wait_for_callback(listener: TcpListener, expected_state: &str) -> Result<String> {
        // Accept a single connection
        let (mut stream, _addr) = listener
            .accept()
            .await
            .map_err(|e| AxisError::OAuthError(format!("Failed to accept connection: {e}")))?;

        // Read the HTTP request
        let mut buffer = vec![0u8; 4096];
        let n = stream
            .read(&mut buffer)
            .await
            .map_err(|e| AxisError::OAuthError(format!("Failed to read request: {e}")))?;

        let request = String::from_utf8_lossy(&buffer[..n]);

        // Parse the request to extract query parameters
        let (code, state, error) = Self::parse_callback_request(&request);

        // Send response to browser
        let (status, html) = if error.is_some() || code.is_none() {
            ("400 Bad Request", ERROR_HTML)
        } else {
            ("200 OK", SUCCESS_HTML)
        };

        let response = format!(
            "HTTP/1.1 {status}\r\nContent-Type: text/html; charset=utf-8\r\nContent-Length: {}\r\nConnection: close\r\n\r\n{html}",
            html.len()
        );

        let _ = stream.write_all(response.as_bytes()).await;
        let _ = stream.flush().await;

        // Check for errors
        if let Some(err) = error {
            log::error!("OAuth callback returned error: {err}");
            return Err(AxisError::OAuthError(format!("OAuth error: {err}")));
        }

        let code = code.ok_or_else(|| {
            log::error!("OAuth callback missing authorization code");
            AxisError::OAuthError("Missing authorization code".to_string())
        })?;

        // Validate CSRF state
        if let Some(received_state) = state {
            if received_state != expected_state {
                log::error!("CSRF state mismatch");
                return Err(AxisError::OAuthError("CSRF state mismatch".to_string()));
            }
        } else {
            log::warn!("OAuth callback missing state parameter");
        }

        Ok(code)
    }

    /// Parse the OAuth callback request to extract code, state, and error
    fn parse_callback_request(request: &str) -> (Option<String>, Option<String>, Option<String>) {
        // Extract the request line (GET /callback?... HTTP/1.1)
        let first_line = request.lines().next().unwrap_or("");
        let path = first_line.split_whitespace().nth(1).unwrap_or("");

        // Parse query string
        let query_start = path.find('?').map(|i| i + 1).unwrap_or(path.len());
        let query = &path[query_start..];

        let mut code = None;
        let mut state = None;
        let mut error = None;

        for pair in query.split('&') {
            let mut parts = pair.splitn(2, '=');
            let key = parts.next().unwrap_or("");
            let value = parts.next().unwrap_or("");
            let decoded = urlencoding::decode(value).unwrap_or_else(|_| value.into());

            match key {
                "code" => code = Some(decoded.into_owned()),
                "state" => state = Some(decoded.into_owned()),
                "error" => error = Some(decoded.into_owned()),
                _ => {}
            }
        }

        (code, state, error)
    }
}
