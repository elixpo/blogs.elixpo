import { redirect } from 'next/navigation';

export default function Register() {
  redirect('/auth/login');
}
