import React from "react";

export default class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }

  componentDidCatch(error, info) {
    // eslint-disable-next-line no-console
    console.error("App crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 16, fontFamily: "system-ui, -apple-system, Segoe UI, Roboto, sans-serif" }}>
          <div style={{ fontSize: 18, fontWeight: 800, marginBottom: 8 }}>화면 오류가 발생했습니다</div>
          <div style={{ color: "#666", marginBottom: 12 }}>
            일부 기능이 예상치 못하게 종료되었습니다. 새로고침 후 다시 시도해 주세요.
          </div>
          <button
            onClick={() => window.location.reload()}
            style={{
              padding: "10px 12px",
              borderRadius: 12,
              border: "1px solid #ddd",
              background: "#fff",
              cursor: "pointer",
              fontWeight: 700,
            }}
          >
            새로고침
          </button>
          {this.state.error ? (
            <pre style={{ marginTop: 12, whiteSpace: "pre-wrap", color: "#999" }}>
              {String(this.state.error?.message || this.state.error)}
            </pre>
          ) : null}
        </div>
      );
    }
    return this.props.children;
  }
}
