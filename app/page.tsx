import { redirect } from 'next/navigation';

export default function Home() {
  // Redirect root to the admin dashboard
  redirect('/admin');
}
