import React from 'react';
import { BrowserRouter as Router, Route, Switch } from 'react-router-dom';
import Dashboard from './components/Dashboard';
import Formulario from './components/Formulario';
import Graficos from './components/Graficos';
import Presentacion from './components/Presentacion';
import Admin from './components/Admin';
import DebugDatos from './components/DebugDatos';
import LogsViewer from './components/LogsViewer';
import LoadingIndicator from './components/LoadingIndicator';
import ProtectedRoute from './components/ProtectedRoute';
import { AuthProvider } from './contexts/AuthContext';

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <ProtectedRoute>
            <Switch>
              <Route path="/" exact component={Dashboard} />
              <Route path="/formulario" component={Formulario} />
              <Route path="/graficos" component={Graficos} />
              <Route path="/presentacion" component={Presentacion} />
              <Route path="/admin" component={Admin} />
              <Route path="/logs" component={LogsViewer} />
              <Route path="/debug" component={DebugDatos} />
            </Switch>
          </ProtectedRoute>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;