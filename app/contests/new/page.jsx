import AppShell from '../../../src/components/AppShell';
import ContestCreateForm from '../../../src/components/contests/ContestCreateForm';

export const metadata = { title: 'Create a writing contest', robots: { index: false, follow: false } };

export default function NewContestPage() {
  return <AppShell><ContestCreateForm /></AppShell>;
}
