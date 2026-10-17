import { Route, Routes } from 'react-router-dom';
import { LandingPage } from './pages/LandingPage';
import { AuthPage } from './pages/AuthPage';
import { Protected } from './contexts/AuthContext';
import { WorkspaceLayout } from './components/layout/WorkspaceLayout';
import { Dashboard, ProjectList } from './pages/Dashboard';
import { CreateProject } from './pages/CreateProject';
import { ProjectDetail } from './pages/ProjectDetail';
import { MilestoneDetail } from './pages/MilestoneDetail';
import { PaymentHistory, SettingsPage } from './pages/AccountPages';

export function App() {
  return <Routes><Route path="/login" element={<AuthPage/>}/><Route path="/register" element={<AuthPage registerMode/>}/>
    <Route element={<Protected><WorkspaceLayout/></Protected>}>
      <Route path="/dashboard" element={<Dashboard/>}/><Route path="/projects" element={<ProjectList/>}/><Route path="/projects/new" element={<CreateProject/>}/><Route path="/projects/:id" element={<ProjectDetail/>}/><Route path="/milestones/:id" element={<MilestoneDetail/>}/><Route path="/payments" element={<PaymentHistory/>}/><Route path="/settings" element={<SettingsPage/>}/>
    </Route><Route path="*" element={<LandingPage/>}/></Routes>;
}
