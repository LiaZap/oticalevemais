import AtendimentosPage from './Atendimentos';
import ReportsPage from './Reports';
import TeamPage from './Team';
import SettingsPage from './Settings';
import WhatsAppPage from './WhatsApp';
import PlaceholderPage from './placeholders/PlaceholderPage';

export const Atendimentos = AtendimentosPage;
export const Reports = ReportsPage;
export const Team = TeamPage;
export const Settings = SettingsPage;
export const WhatsApp = WhatsAppPage;
export const Help = () => <PlaceholderPage title="Central de Ajuda" />;
