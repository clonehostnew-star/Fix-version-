import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

export default function ContactPage() {
  return (
    <main className="container py-10 space-y-6">
      <h1 className="text-2xl font-headline font-bold">Contact</h1>
      <form className="max-w-lg grid gap-3">
        <Input placeholder="Email" required />
        <Input placeholder="Subject" required />
        <Textarea placeholder="Message" rows={5} required />
        <Button type="submit">Send</Button>
      </form>
    </main>
  );
}

