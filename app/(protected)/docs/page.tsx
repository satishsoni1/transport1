'use client';

import { useAuth } from '@/app/context/auth-context';
import { Button } from '@/components/ui/button';
import { DOC_CATEGORIES } from '@/lib/docs-content';
import { Download, BookOpen, Lightbulb, ListChecks } from 'lucide-react';

export default function DocsPage() {
  const { user } = useAuth();
  if (!user) return null;

  const generatedOn = new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

  return (
    <div className="space-y-6">
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .docs-printable, .docs-printable * { visibility: visible; }
          .docs-printable { position: absolute; top: 0; left: 0; width: 100%; padding: 0; }
          .no-print { display: none !important; }
          a { color: inherit !important; text-decoration: none !important; }
        }
      `}</style>

      <div className="no-print flex justify-between items-start gap-4">
        <div>
          <h1 className="text-3xl font-bold">User Guide &amp; Documentation</h1>
          <p className="text-sm text-muted-foreground mt-1">
            Every module in Trimurti TMS — what it does, how to use it, and a real-world use case.
            Share this with new staff or clients.
          </p>
        </div>
        <Button className="gap-2 shrink-0" onClick={() => window.print()}>
          <Download className="w-4 h-4" />
          Export as PDF
        </Button>
      </div>

      <div className="docs-printable space-y-10">
        <div className="hidden print:block mb-6">
          <h1 className="text-2xl font-bold">Trimurti TMS — User Guide &amp; Documentation</h1>
          <p className="text-sm text-slate-500">Generated on {generatedOn}</p>
        </div>

        <nav className="no-print rounded-lg border bg-slate-50 p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-semibold text-slate-700">
            <BookOpen className="w-4 h-4" />
            Jump to a section
          </p>
          <div className="flex flex-wrap gap-x-4 gap-y-1 text-sm">
            {DOC_CATEGORIES.map((cat) => (
              <a key={cat.id} href={`#${cat.id}`} className="text-blue-700 hover:underline">
                {cat.title}
              </a>
            ))}
          </div>
        </nav>

        {DOC_CATEGORIES.map((cat) => (
          <section key={cat.id} id={cat.id} className="scroll-mt-20 break-inside-avoid">
            <h2 className="text-2xl font-bold border-b pb-2">{cat.title}</h2>
            {cat.intro ? <p className="mt-3 text-sm text-slate-600">{cat.intro}</p> : null}

            <div className="mt-4 space-y-8">
              {cat.features.map((feature) => (
                <div key={feature.title} className="break-inside-avoid rounded-lg border p-4">
                  <h3 className="text-lg font-semibold">{feature.title}</h3>
                  <p className="mt-1 text-sm text-slate-700">{feature.purpose}</p>

                  <div className="mt-3">
                    <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-slate-500">
                      <ListChecks className="w-3.5 h-3.5" />
                      How to use
                    </p>
                    <ol className="mt-1.5 list-decimal space-y-1 pl-5 text-sm text-slate-700">
                      {feature.steps.map((step, idx) => (
                        <li key={idx}>{step}</li>
                      ))}
                    </ol>
                  </div>

                  <div className="mt-3 rounded-md bg-emerald-50 p-3 text-sm text-emerald-900">
                    <span className="font-semibold">Use case: </span>
                    {feature.useCase}
                  </div>

                  {feature.tips && feature.tips.length > 0 ? (
                    <div className="mt-3">
                      <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-amber-600">
                        <Lightbulb className="w-3.5 h-3.5" />
                        Tips
                      </p>
                      <ul className="mt-1.5 list-disc space-y-1 pl-5 text-sm text-slate-700">
                        {feature.tips.map((tip, idx) => (
                          <li key={idx}>{tip}</li>
                        ))}
                      </ul>
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
