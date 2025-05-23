'use client';
import {
  type FormHTMLAttributes,
  type HTMLAttributes,
  type ReactNode,
  type TextareaHTMLAttributes,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Loader2, RefreshCw, Send, X } from 'lucide-react';
import defaultMdxComponents from 'fumadocs-ui/mdx';
import { cn } from '@/lib/cn';
import { buttonVariants } from '@/components/ui/button';
import type { Processor } from './markdown-processor';
import Link from 'fumadocs-core/link';
import {
  AIProvider,
  type EngineType,
  type MessageRecord,
  useAI,
  useAIMessages,
} from '@/components/fumadocs/ai/context';
import {
  ScrollArea,
  ScrollViewport,
} from 'fumadocs-ui/components/ui/scroll-area';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogOverlay,
  DialogPortal,
  type DialogProps,
  DialogTitle,
} from '@radix-ui/react-dialog';
import { cva } from 'class-variance-authority';

function SearchAIMessages() {
  const messages = useAIMessages();

  return (
    <div className="flex flex-col gap-4 p-3 pb-0">
      {messages.map((item, i) => (
        <Message key={i} message={item} />
      ))}
    </div>
  );
}

function SearchAIActions() {
  const { loading, regenerateLast, clearMessages } = useAI();
  const messages = useAIMessages();

  if (messages.length === 0) return null;
  return (
    <div className="from-fd-popover sticky bottom-0 flex flex-row items-center justify-end gap-2 bg-gradient-to-t px-3 py-1.5 empty:hidden">
      {!loading && messages.at(-1)?.role === 'assistant' && (
        <button
          type="button"
          className={cn(
            buttonVariants({
              variant: 'secondary',
            }),
            'text-fd-muted-foreground gap-1.5 rounded-full',
          )}
          onClick={regenerateLast}
        >
          <RefreshCw className="size-4" />
          Retry
        </button>
      )}
      <button
        type="button"
        className={cn(
          buttonVariants({
            variant: 'secondary',
          }),
          'text-fd-muted-foreground rounded-full',
        )}
        onClick={clearMessages}
      >
        Clear Chat
      </button>
    </div>
  );
}

function SearchAIInput(props: FormHTMLAttributes<HTMLFormElement>) {
  const { loading, onSubmit, abortAnswer } = useAI();
  const [message, setMessage] = useState('');

  const onStart = (e?: React.FormEvent) => {
    e?.preventDefault();
    setMessage('');
    onSubmit(message);
  };

  useEffect(() => {
    if (!loading) document.getElementById('nd-ai-input')?.focus();
  }, [loading]);

  return (
    <form
      {...props}
      className={cn(
        'bg-fd-popover text-fd-popover-foreground flex flex-row items-start rounded-xl border pe-2 shadow-lg transition-colors',
        loading && 'bg-fd-muted',
        props.className,
      )}
      onSubmit={onStart}
    >
      <Input
        value={message}
        placeholder={loading ? 'AI is answering...' : 'Ask AI something'}
        disabled={loading}
        onChange={(e) => {
          setMessage(e.target.value);
        }}
        onKeyDown={(event) => {
          if (!event.shiftKey && event.key === 'Enter') {
            onStart();
            event.preventDefault();
          }
        }}
      />
      {loading ? (
        <button
          type="button"
          className={cn(
            buttonVariants({
              variant: 'secondary',
              className: 'mt-2 gap-2 rounded-full',
            }),
          )}
          onClick={abortAnswer}
        >
          <Loader2 className="text-fd-muted-foreground size-4 animate-spin" />
          Abort Answer
        </button>
      ) : (
        <button
          type="submit"
          className={cn(
            buttonVariants({
              variant: 'ghost',
              className: 'mt-2 rounded-full p-1.5',
            }),
          )}
          disabled={message.length === 0}
        >
          <Send className="size-4" />
        </button>
      )}
    </form>
  );
}

function List(props: Omit<HTMLAttributes<HTMLDivElement>, 'dir'>) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current) return;

    const observer = new ResizeObserver(() => {
      const container = containerRef.current;
      if (!container) return;

      container.scrollTo({
        top: container.scrollHeight,
        behavior: 'instant',
      });
    });

    containerRef.current.scrollTop =
      containerRef.current.scrollHeight - containerRef.current.clientHeight;

    // after animation
    setTimeout(() => {
      const element = containerRef.current?.firstElementChild;

      if (element) {
        observer.observe(element);
      }
    }, 2000);

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <ScrollArea {...props}>
      <ScrollViewport ref={containerRef} className="max-h-[calc(100dvh-240px)]">
        {props.children}
      </ScrollViewport>
    </ScrollArea>
  );
}

function Input(props: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  const ref = useRef<HTMLDivElement>(null);
  const shared = cn('col-start-1 row-start-1 max-h-60 min-h-12 p-3');

  return (
    <div className="grid flex-1">
      <textarea
        id="nd-ai-input"
        className={cn(
          shared,
          'placeholder:text-fd-muted-foreground resize-none bg-transparent focus-visible:outline-none',
        )}
        {...props}
      />
      <div ref={ref} className={cn(shared, 'invisible whitespace-pre-wrap')}>
        {`${props.value?.toString() ?? ''}\n`}
      </div>
    </div>
  );
}

let processor: Processor | undefined;
const map = new Map<string, ReactNode>();

const roleName: Record<string, string> = {
  user: 'you',
  assistant: 'basstheprogrammingfish',
};

function Message({ message }: { message: MessageRecord }) {
  const { onSubmit } = useAI();
  const { suggestions = [], references = [] } = message;

  return (
    <div>
      <p
        className={cn(
          'text-fd-muted-foreground mb-1 text-xs font-medium',
          message.role === 'assistant' && 'text-fd-primary',
        )}
      >
        {roleName[message.role] ?? 'unknown'}
      </p>
      <div className="prose text-sm">
        <Markdown text={message.content} />
      </div>
      {references.length > 0 ? (
        <div className="mt-2 flex flex-row flex-wrap items-center gap-1">
          {references.map((item, i) => (
            <Link
              key={i}
              href={item.url}
              className="hover:bg-fd-accent hover:text-fd-accent-foreground block rounded-lg border p-3 text-xs"
            >
              <p className="font-medium">{item.title}</p>
              <p className="text-fd-muted-foreground">
                {item.description ?? 'Reference'}
              </p>
            </Link>
          ))}
        </div>
      ) : null}
      {suggestions.length > 0 ? (
        <div className="flex flex-row items-center gap-1 overflow-x-auto p-2">
          {suggestions.map((item) => (
            <button
              key={item}
              type="button"
              className={cn(
                buttonVariants({
                  variant: 'ghost',
                  className: 'text-nowrap',
                }),
              )}
              onClick={() => {
                onSubmit(item);
              }}
            >
              {item}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function Markdown({ text }: { text: string }) {
  const [currentText, setCurrentText] = useState<string>();
  const [rendered, setRendered] = useState<ReactNode>(map.get(text));

  async function run() {
    const { createProcessor } = await import('./markdown-processor');

    processor ??= createProcessor();
    let result = map.get(text);

    result ??= await processor
      .process(text, {
        ...defaultMdxComponents,
        img: undefined, // use JSX
      })
      .catch(() => text);

    map.set(text, result);
    setRendered(result);
  }

  if (text !== currentText) {
    setCurrentText(text);
    void run();
  }

  return rendered ?? text;
}

function ShowOnMessages({ children }: { children: ReactNode }) {
  const messages = useAIMessages();

  if (messages.length === 0) return null;
  return children;
}

const typeButtonVariants = cva(
  'inline-flex items-center justify-center rounded-lg px-2 py-1 text-sm font-medium transition-colors duration-100',
  {
    variants: {
      active: {
        true: 'bg-fd-primary/10 text-fd-primary',
        false: 'text-fd-muted-foreground',
      },
    },
  },
);

export default function AISearch(props: DialogProps) {
  const [type, setType] = useState<EngineType>('orama');

  return (
    <Dialog {...props}>
      {props.children}
      <AIProvider type={type} loadEngine={props.open}>
        <DialogPortal>
          <DialogOverlay className="data-[state=closed]:animate-fd-fade-out data-[state=open]:animate-fd-fade-in fixed inset-0 z-50 bg-black/30 backdrop-blur-sm" />

          <DialogContent
            onOpenAutoFocus={(e) => {
              document.getElementById('nd-ai-input')?.focus();
              e.preventDefault();
            }}
            aria-describedby={undefined}
            className="data-[state=closed]:animate-fd-dialog-out data-[state=open]:animate-fd-dialog-in fixed bottom-20 left-1/2 z-50 w-[98vw] max-w-[860px] -translate-x-1/2 focus-visible:outline-none"
          >
            <ShowOnMessages>
              <List className="bg-fd-popover mb-3 rounded-xl border shadow-lg">
                <SearchAIMessages />
                <SearchAIActions />
              </List>
            </ShowOnMessages>
            <SearchAIInput className="rounded-b-none border-b-0" />
            <div className="bg-fd-muted text-fd-muted-foreground flex flex-row flex-wrap items-center justify-between gap-2 rounded-b-xl border-x border-b px-3 py-1.5 shadow-lg">
              <div className="flex flex-row items-center">
                <button
                  className={cn(
                    typeButtonVariants({ active: type === 'orama' }),
                  )}
                  onClick={() => {
                    setType('orama');
                  }}
                >
                  Search
                </button>
                <button
                  className={cn(
                    typeButtonVariants({ active: type === 'ai-sdk' }),
                  )}
                  onClick={() => {
                    setType('ai-sdk');
                  }}
                >
                  Agent
                </button>
              </div>
              <div className="flex flex-row items-center gap-2">
                <DialogTitle className="flex-1 text-xs">
                  Powered by{' '}
                  <a
                    href={
                      type === 'orama'
                        ? 'https://orama.com'
                        : type === 'inkeep'
                          ? 'https://inkeep.com'
                          : 'https://sdk.vercel.ai'
                    }
                    target="_blank"
                    className="text-fd-popover-foreground font-medium"
                    rel="noreferrer noopener"
                  >
                    {type === 'orama' && 'Orama AI'}
                    {type === 'inkeep' && 'Inkeep'}
                    {type === 'ai-sdk' && 'AI SDK'}
                  </a>
                  . AI can be inaccurate, please verify the information.
                </DialogTitle>

                <DialogClose
                  aria-label="Close"
                  tabIndex={-1}
                  className="hover:bg-fd-accent hover:text-fd-accent-foreground -me-1.5 rounded-full p-1.5"
                >
                  <X className="size-4" />
                </DialogClose>
              </div>
            </div>
          </DialogContent>
        </DialogPortal>
      </AIProvider>
    </Dialog>
  );
}
