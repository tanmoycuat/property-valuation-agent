import { useMemo, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { MapPin, Search, Sparkles } from "lucide-react";
import {
  api,
  CONDITIONS,
  formatCurrency,
  PROPERTY_TYPES,
  type Condition,
  type Valuation,
} from "../lib/api";
import { Button, Card, Field, Notice, SectionLabel, Skeleton, inputClass } from "../components/ui";

const DEFAULT_INPUTS = {
  propertyType: "Detached house",
  areaSqm: 118,
  bedrooms: 3,
  condition: "good" as Condition,
  locationScore: 76,
};

export default function ValuationDesk() {
  const [searchTerm, setSearchTerm] = useState("");
  const [submittedTerm, setSubmittedTerm] = useState("");
  const [inputs, setInputs] = useState(DEFAULT_INPUTS);
  const [valuation, setValuation] = useState<Valuation | null>(null);
  const [question, setQuestion] = useState("");

  const lookup = useQuery({
    queryKey: ["/api/properties/lookup", submittedTerm],
    queryFn: () => api.lookupProperty(submittedTerm),
    enabled: submittedTerm.length >= 3,
  });

  const valuationMutation = useMutation({
    mutationFn: api.createValuation,
    onSuccess: setValuation,
  });

  const assistantMutation = useMutation({ mutationFn: api.askAssistant });

  const context = useMemo(() => (valuation ? JSON.stringify(valuation) : null), [valuation]);

  function set<K extends keyof typeof inputs>(key: K, value: (typeof inputs)[K]) {
    setInputs((current) => ({ ...current, [key]: value }));
  }

  return (
    <div className="mx-auto max-w-[1500px] px-5 py-7 sm:px-8 sm:py-10 lg:px-12">
      <header className="mb-8 max-w-3xl">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground">
          Valuation desk / 01
        </p>
        <h1 className="mt-2 text-3xl font-semibold tracking-tight sm:text-4xl">
          A clear view of value.
        </h1>
        <p className="mt-3 text-sm leading-6 text-muted-foreground">
          Build a defensible estimate from the details you know. Plotline keeps the assumptions
          visible, so your next conversation starts with context&mdash;not a black box.
        </p>
      </header>

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_minmax(0,520px)]">
        <div className="flex flex-col gap-6">
          <Card>
            <SectionLabel step="Step 01" title="Locate the property" />
            <form
              className="flex flex-col gap-3 sm:flex-row"
              onSubmit={(event) => {
                event.preventDefault();
                if (searchTerm.trim().length >= 3) setSubmittedTerm(searchTerm.trim());
              }}
            >
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <input
                  data-testid="input-property-search"
                  className={inputClass + " mt-0 pl-10"}
                  placeholder="e.g. 24 Rathmines Road, Dublin"
                  aria-label="Property address or place"
                  value={searchTerm}
                  onChange={(event) => setSearchTerm(event.target.value)}
                />
              </div>
              <Button data-testid="button-lookup-property" type="submit">
                Locate
              </Button>
            </form>
            <p className="mt-2 text-xs text-muted-foreground">
              Start with an address, landmark, or place name.
            </p>

            {lookup.isFetching ? <Skeleton className="mt-5 h-16 w-full" /> : null}

            {lookup.isError ? (
              <Notice tone="error">
                <span>
                  We couldn&apos;t locate that place. Try a fuller address or nearby landmark, then
                  search again.
                </span>
                <button
                  data-testid="button-retry-lookup"
                  className="shrink-0 font-semibold underline"
                  onClick={() => lookup.refetch()}
                >
                  Try again
                </button>
              </Notice>
            ) : null}

            {lookup.data && !lookup.isFetching ? (
              <Notice>
                <MapPin className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  <strong data-testid="text-property-name" className="block font-semibold">
                    {lookup.data.displayName}
                  </strong>
                  {lookup.data.latitude.toFixed(4)}, {lookup.data.longitude.toFixed(4)} &middot;{" "}
                  {lookup.data.source}
                  <span className="mt-1 block text-xs text-muted-foreground">
                    Location coordinates are added automatically when a property is found.
                  </span>
                </span>
              </Notice>
            ) : null}
          </Card>

          <Card>
            <SectionLabel step="Step 02" title="Shape the estimate" />
            <p className="-mt-3 mb-5 text-sm text-muted-foreground">
              Adjust the inputs you can stand behind.
            </p>
            <form
              className="grid gap-4 sm:grid-cols-2"
              onSubmit={(event) => {
                event.preventDefault();
                valuationMutation.mutate({
                  ...inputs,
                  areaSqm: Number(inputs.areaSqm),
                  bedrooms: Number(inputs.bedrooms),
                  locationScore: Number(inputs.locationScore),
                  latitude: lookup.data?.latitude,
                  longitude: lookup.data?.longitude,
                });
              }}
            >
              <Field label="Property type">
                <select
                  data-testid="select-property-type"
                  className={inputClass}
                  value={inputs.propertyType}
                  onChange={(event) => set("propertyType", event.target.value)}
                >
                  {PROPERTY_TYPES.map((type) => (
                    <option key={type}>{type}</option>
                  ))}
                </select>
              </Field>

              <Field label="Condition">
                <select
                  data-testid="select-condition"
                  className={inputClass}
                  value={inputs.condition}
                  onChange={(event) => set("condition", event.target.value as Condition)}
                >
                  {CONDITIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </Field>

              <Field label="Floor area (m&sup2;)">
                <input
                  data-testid="input-area-sqm"
                  className={inputClass}
                  type="number"
                  min={10}
                  value={inputs.areaSqm}
                  onChange={(event) => set("areaSqm", Number(event.target.value))}
                />
              </Field>

              <Field label="Bedrooms">
                <input
                  data-testid="input-bedrooms"
                  className={inputClass}
                  type="number"
                  min={0}
                  value={inputs.bedrooms}
                  onChange={(event) => set("bedrooms", Number(event.target.value))}
                />
              </Field>

              <div className="sm:col-span-2">
                <Field label={"Location score (" + inputs.locationScore + "/100)"}>
                  <input
                    data-testid="input-location-score"
                    className="mt-3 w-full accent-[var(--color-primary)]"
                    type="range"
                    min={0}
                    max={100}
                    value={inputs.locationScore}
                    onChange={(event) => set("locationScore", Number(event.target.value))}
                  />
                </Field>
              </div>

              <div className="sm:col-span-2">
                <Button
                  data-testid="button-calculate-valuation"
                  type="submit"
                  disabled={valuationMutation.isPending}
                  className="w-full sm:w-auto"
                >
                  {valuationMutation.isPending ? "Calculating..." : "Calculate valuation"}
                </Button>
              </div>
            </form>

            {valuationMutation.isError ? (
              <Notice tone="error">
                The estimate could not be calculated. Check the values and retry.
              </Notice>
            ) : null}
          </Card>
        </div>

        <div className="flex flex-col gap-6">
          <ResultCard valuation={valuation} pending={valuationMutation.isPending} />

          <Card>
            <div className="mb-4 flex items-center justify-between gap-3">
              <h2 className="text-lg font-semibold">Ask the valuation assistant</h2>
              <span className="rounded-full bg-muted px-3 py-1 text-xs font-medium text-muted-foreground">
                {valuation ? "Estimate in context" : "No estimate yet"}
              </span>
            </div>
            <p className="mb-4 text-sm text-muted-foreground">
              Pressure-test the estimate, or ask what to investigate next.
            </p>
            <form
              className="flex flex-col gap-3"
              onSubmit={(event) => {
                event.preventDefault();
                if (question.trim()) {
                  assistantMutation.mutate({ prompt: question.trim(), context });
                }
              }}
            >
              <textarea
                data-testid="input-assistant-question"
                className={inputClass + " min-h-[96px] resize-y"}
                aria-label="Question for assistant"
                placeholder="What are the two biggest unknowns here?"
                value={question}
                onChange={(event) => setQuestion(event.target.value)}
              />
              <Button
                data-testid="button-ask-assistant"
                type="submit"
                disabled={assistantMutation.isPending}
              >
                <Sparkles className="h-4 w-4" />
                {assistantMutation.isPending ? "Thinking..." : "Ask"}
              </Button>
            </form>

            {assistantMutation.isPending ? <Skeleton className="mt-5 h-24 w-full" /> : null}

            {assistantMutation.isError ? (
              <Notice tone="error">
                The assistant is unavailable right now. Try again in a moment.
              </Notice>
            ) : null}

            {assistantMutation.data ? (
              <div className="animate-rise mt-5 rounded-xl bg-secondary/65 p-4">
                <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Model status &middot;{" "}
                  {assistantMutation.data.configured ? "Connected" : "Limited configuration"}
                </p>
                <p
                  data-testid="text-assistant-response"
                  className="whitespace-pre-wrap text-sm leading-6 text-secondary-foreground"
                >
                  {assistantMutation.data.message}
                </p>
              </div>
            ) : null}
          </Card>
        </div>
      </div>
    </div>
  );
}

function ResultCard({ valuation, pending }: { valuation: Valuation | null; pending: boolean }) {
  if (pending && !valuation) {
    return (
      <Card>
        <Skeleton className="h-6 w-40" />
        <Skeleton className="mt-4 h-12 w-64" />
        <Skeleton className="mt-6 h-32 w-full" />
      </Card>
    );
  }

  if (!valuation) {
    return (
      <Card className="flex min-h-[320px] flex-col items-start justify-center">
        <h2 className="text-lg font-semibold">Your estimate lands here</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          Complete the inputs, then we&apos;ll show the range and the reasoning behind it.
        </p>
        <p className="mt-6 text-sm font-medium text-primary">
          Good estimates invite better decisions.
        </p>
      </Card>
    );
  }

  const currency = valuation.currency;

  return (
    <>
      <div className="animate-rise rounded-2xl border border-primary/25 bg-primary p-6 text-primary-foreground shadow-md sm:p-7">
        <p className="text-xs font-semibold uppercase tracking-[0.16em] opacity-80">
          Indicative value
        </p>
        <p data-testid="text-estimated-value" className="mt-2 text-4xl font-semibold tracking-tight">
          {formatCurrency(valuation.estimatedValue, currency)}
        </p>
        <p className="mt-2 text-sm opacity-85">
          {formatCurrency(valuation.lowValue, currency)} &ndash;{" "}
          {formatCurrency(valuation.highValue, currency)}
        </p>
        <div className="mt-6 grid grid-cols-2 gap-4 border-t border-primary-foreground/20 pt-5 text-sm">
          <div>
            <p className="opacity-75">Price per sqm</p>
            <p className="mt-1 text-lg font-semibold">
              {formatCurrency(valuation.pricePerSqm, currency)}
            </p>
          </div>
          <div>
            <p className="opacity-75">Confidence</p>
            <p data-testid="text-confidence" className="mt-1 text-lg font-semibold">
              {valuation.confidence}%
            </p>
          </div>
        </div>
      </div>

      <Card>
        <h2 className="text-lg font-semibold">How this was formed</h2>
        <ul className="mt-4 flex flex-col gap-3">
          {valuation.breakdown.map((item) => (
            <li
              key={item.label}
              className="flex items-start justify-between gap-4 border-b border-border/70 pb-3 last:border-0 last:pb-0"
            >
              <div>
                <p className="text-sm font-semibold">{item.label}</p>
                <p className="text-xs text-muted-foreground">{item.detail}</p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums">
                {item.label === "Local market baseline"
                  ? formatCurrency(item.value, currency)
                  : (item.value > 0 ? "+" : "") + item.value + "%"}
              </span>
            </li>
          ))}
        </ul>

        <h3 className="mt-6 text-sm font-semibold">Estimate in context</h3>
        <ul className="mt-2 flex list-disc flex-col gap-1.5 pl-5 text-sm leading-6 text-muted-foreground">
          {valuation.methodology.map((line) => (
            <li key={line}>{line}</li>
          ))}
        </ul>
      </Card>
    </>
  );
}
