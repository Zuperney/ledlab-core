// components/ErrorBoundary.jsx — isola erros de uma tela sem derrubar o app.
import { Component } from "react";
import { TriangleAlert } from "lucide-react";
import { T } from "../ui/tokens.js";
import { btn } from "../ui/styles.js";

export default class ErrorBoundary extends Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  componentDidCatch(err, info) {
    console.error("ErrorBoundary:", err, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: 32, textAlign: "center", color: T.mut }}>
          <TriangleAlert size={32} color={T.amb} />
          <h3 style={{ color: T.txt, margin: "12px 0 4px" }}>Algo deu errado nesta tela</h3>
          <p style={{ margin: "0 0 16px" }}>O resto do app continua funcionando normalmente.</p>
          <button style={btn("primary")} onClick={() => this.setState({ hasError: false })}>
            Tentar de novo
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}
