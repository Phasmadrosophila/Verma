import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { VaultProvider, useVault } from './VaultContext';
import { Layout } from './components/Layout';
import { LockScreen } from './pages/LockScreen';
import { EntryList } from './pages/EntryList';
import { EntryDetail } from './pages/EntryDetail';
import { EntryForm } from './pages/EntryForm';
import { AskVault } from './pages/AskVault';
import { SmartImport } from './pages/SmartImport';

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
  const { isLocked, isInitialized, status } = useVault();
  
  if (status === 'loading') return <div>Loading...</div>;
  if (!isInitialized || isLocked) return <Navigate to="/lock" replace />;
  return <>{children}</>;
};

function App() {
  return (
    <VaultProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/lock" element={<LockScreen />} />
          <Route element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route path="/" element={<EntryList />} />
            <Route path="/entry/new" element={<EntryForm />} />
            <Route path="/entry/:id" element={<EntryDetail />} />
            <Route path="/entry/:id/edit" element={<EntryForm />} />
            <Route path="/ask" element={<AskVault />} />
            <Route path="/import" element={<SmartImport />} />
          </Route>
        </Routes>
      </BrowserRouter>
    </VaultProvider>
  );
}

export default App;
