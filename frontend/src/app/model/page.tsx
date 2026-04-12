export const metadata = {
  title: "Model Card — Genomic VEP",
  description: "Training data, performance, limitations, and ethics for the Genomic VEP variant effect predictor.",
};

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xs uppercase tracking-widest font-semibold mb-3" style={{ color: "var(--accent)" }}>
        {title}
      </h2>
      <div className="text-sm leading-relaxed space-y-3" style={{ color: "var(--foreground)" }}>
        {children}
      </div>
    </section>
  );
}

function Row({ k, v }: { k: string; v: string }) {
  return (
    <div className="flex justify-between py-1.5 border-b" style={{ borderColor: "var(--card-border)" }}>
      <span style={{ color: "var(--muted)" }}>{k}</span>
      <span className="font-mono text-xs" style={{ color: "var(--foreground)" }}>{v}</span>
    </div>
  );
}

export default function ModelCardPage() {
  return (
    <>
      <main className="flex-1 max-w-4xl mx-auto w-full px-6 py-14">
        <h1 className="text-3xl font-bold tracking-tight text-white mb-2">Model Card</h1>
        <p className="text-sm mb-10" style={{ color: "var(--muted)" }}>
          Documentation for the Genomic VEP variant effect predictor, following the model card framework
          introduced by <a href="https://arxiv.org/abs/1810.03993" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Mitchell et al. (2019)</a>.
        </p>

        <Section title="Model Details">
          <div className="card p-4">
            <Row k="Name" v="Genomic VEP (NT-v2 + head)" />
            <Row k="Base model" v="nucleotide-transformer-v2-50m-multi-species" />
            <Row k="Encoder params" v="50M (frozen)" />
            <Row k="Trainable params" v="~197k (classification head)" />
            <Row k="Architecture" v="frozen encoder → mean pool → (alt − ref) → MLP 768→256→1" />
            <Row k="Context window" v="1001 bp centered on variant" />
            <Row k="Output" v="Pathogenicity probability ∈ [0, 1]" />
            <Row k="Framework" v="PyTorch 2.x + HuggingFace Transformers" />
          </div>
        </Section>

        <Section title="Intended Use">
          <p>
            Predicting the pathogenicity of single-nucleotide variants in the human genome (GRCh38), for
            <strong className="text-white"> research and educational purposes only</strong>. The target audience is ML practitioners
            and computational biologists exploring genomic foundation models and interpretability techniques.
          </p>
          <p className="text-xs" style={{ color: "#f87171" }}>
            ⚠ <strong>Not for clinical decision-making.</strong> This model has not been validated against functional
            assays, has not been through regulatory review, and is not intended to inform diagnosis or treatment.
          </p>
        </Section>

        <Section title="Training Data">
          <div className="card p-4">
            <Row k="Source" v="ClinVar (NCBI) + GRCh38 reference" />
            <Row k="Total variants" v="350,599" />
            <Row k="Train / Val / Test" v="264,241 / 23,344 / 63,014" />
            <Row k="Class balance" v="31% pathogenic / 69% benign" />
            <Row k="Split strategy" v="Chromosome-level (no leakage)" />
            <Row k="Window extraction" v="500 bp flanking on each side" />
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            ClinVar aggregates clinical interpretations of variants from multiple labs. Labels were binarized
            to pathogenic (incl. likely pathogenic) vs. benign (incl. likely benign); variants of uncertain
            significance were excluded. Splits are stratified by chromosome to prevent variant-level leakage.
          </p>
        </Section>

        <Section title="Training Procedure">
          <div className="card p-4">
            <Row k="Loss" v="BCEWithLogitsLoss, pos_weight=2.0" />
            <Row k="Optimizer" v="AdamW, lr=1e-3" />
            <Row k="Batch size" v="32" />
            <Row k="Epochs" v="10 (early stop on val AUROC plateau)" />
            <Row k="Hardware" v="Colab A100 (40GB)" />
            <Row k="Best checkpoint" v="Selected by val AUROC" />
          </div>
        </Section>

        <Section title="Performance">
          <div className="card p-4">
            <Row k="Test AUROC" v="~0.82" />
            <Row k="Test size" v="63,014 variants" />
            <Row k="Inference latency" v="~250 ms / variant (CPU)" />
          </div>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            AUROC is threshold-independent and robust to the class imbalance. Metrics are computed on the
            held-out test set (chromosomes excluded from training). See <code className="font-mono">results/</code> for
            the full eval output and per-class breakdown.
          </p>
        </Section>

        <Section title="Interpretability">
          <p>
            Per-token attributions are computed using <strong className="text-white">Integrated Gradients</strong>
            (<a href="https://arxiv.org/abs/1703.01365" target="_blank" rel="noopener noreferrer" className="underline hover:text-white">Sundararajan et al., 2017</a>)
            via the <code className="font-mono">captum</code> library, with 50 integration steps and a zero baseline in embedding space.
            Attributions satisfy the <em>completeness</em> axiom: they sum to the difference between the model&apos;s
            prediction on the input and on the baseline.
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            The dashboard visualizes attributions as a heatmap over the tokenized ALT sequence. Tokens with
            high positive attribution pushed the prediction toward pathogenic; tokens with low attribution were
            uninformative or pushed toward benign.
          </p>
        </Section>

        <Section title="Limitations & Known Failure Modes">
          <ul className="list-disc pl-5 space-y-2 text-sm" style={{ color: "var(--foreground)" }}>
            <li>
              <strong>Ancestry bias.</strong> ClinVar overrepresents European-ancestry variants. Performance on
              underrepresented populations is likely degraded and has not been systematically measured.
            </li>
            <li>
              <strong>Gene coverage bias.</strong> Well-studied disease genes (BRCA1/2, TP53, etc.) dominate the
              training data. Novel genes and non-coding regions are underrepresented.
            </li>
            <li>
              <strong>Variant type scope.</strong> Only single-nucleotide substitutions are supported. No indels,
              copy number variants, or structural variants.
            </li>
            <li>
              <strong>Context window.</strong> The model sees only ±500 bp around the variant. Long-range
              regulatory effects (enhancers, 3D chromatin contacts) are out of scope.
            </li>
            <li>
              <strong>Label noise.</strong> ClinVar labels are aggregated clinical opinions and contain known
              inconsistencies; the model inherits this noise.
            </li>
            <li>
              <strong>Calibration not verified.</strong> A probability of 0.82 has not been confirmed to correspond
              to an 82% real-world likelihood. Use predictions as relative rankings, not absolute probabilities.
            </li>
          </ul>
        </Section>

        <Section title="Ethics & Responsible Use">
          <p>
            Genetic variant classification directly affects diagnosis, treatment, and reproductive decisions.
            A miscalibrated or biased model deployed in a clinical setting can cause serious harm. This model
            is a research artifact and must not be used in clinical workflows without independent validation,
            regulatory review, and bias audits across ancestries.
          </p>
          <p className="text-xs" style={{ color: "var(--muted)" }}>
            Training data (ClinVar) is publicly available and de-identified. No patient-level information was
            used or is stored.
          </p>
        </Section>

        <Section title="Citation">
          <div className="card p-4 font-mono text-xs" style={{ color: "var(--foreground)" }}>
            <div>Malaper, T. (2026). Genomic VEP: Interpretable Variant Effect</div>
            <div>Prediction with the Nucleotide Transformer. GitHub.</div>
            <div>https://github.com/theomalaper/genomic-vep</div>
          </div>
        </Section>
      </main>
    </>
  );
}
