import Link from "next/link";

export default function ZeroDegreesPage() {
  return (
    <main className="zero-page">
      <section className="zero-hero">
        <div className="zero-hero-copy">
          <p className="section-label zero-label">ZERO DEGREES</p>
          <h1>COFFEE<br />ROASTERS</h1>
          <p className="zero-hero-line">Nothing added.<br /><i>Nothing hidden.</i></p>
          <p className="zero-hero-note">A roasting philosophy by Casa di Stefano.</p>
        </div>
        <div className="zero-hero-mark" aria-hidden="true"><span>0</span><small>degrees</small></div>
      </section>
      <section className="zero-why zero-section">
        <div className="zero-section-heading"><p className="section-label">WHY ZERO?</p><span className="zero-index">01 / 07</span></div>
        <div className="zero-why-grid"><h2><span className="lang-ko">생두가 이미 가진 것을<br />가리지 않는 로스팅.</span><span className="lang-en">A roast that does not<br />hide what the bean already has.</span></h2><div className="zero-body-copy"><p className="zero-lede">Zero is not an absence.</p><p><span className="lang-ko">불필요한 것을 더하지 않고, 어떤 개성도 가리지 않으며, 모든 결정을 감에만 맡기지 않는다는 약속입니다.</span><span className="lang-en">It is a promise to add nothing unnecessary, mask no character, and leave no decision to guesswork alone.</span></p></div></div>
      </section>
      <section className="zero-zeros zero-section">
        <div className="zero-section-heading"><p className="section-label">THE THREE ZEROS</p><span className="zero-index">02 / 07</span></div>
        <div className="zero-principles"><article><b>01</b><h2>ZERO<br />ADDITIVES</h2><p>Nothing unnecessary added.</p><span>좋은 생두에 불필요한 것을 더하지 않습니다.</span></article><article><b>02</b><h2>ZERO<br />MASKING</h2><p>Never hide the character of the bean.</p><span>과도한 로스팅으로 생두의 개성을 가리지 않습니다.</span></article><article><b>03</b><h2>ZERO<br />GUESSWORK</h2><p>Roasting guided by data and experience.</p><span>데이터와 경험을 함께 사용해 로스팅합니다.</span></article></div>
      </section>
      <section className="zero-degrees-section zero-section">
        <div className="zero-section-heading"><p className="section-label">WHY DEGREES?</p><span className="zero-index">03 / 07</span></div>
        <div className="zero-degrees-grid"><div><h2>Craft,<br /><i>measured.</i></h2><p>Degrees represents precision.</p><p className="zero-muted">Temperature, time, development and rate of rise are recorded and reviewed to create repeatable roasting profiles — while experience determines how those numbers become coffee.</p></div><div className="roast-profile" aria-label="Roasting profile elements without simulated data">{[["TEMPERATURE", "Heat"], ["TIME", "Duration"], ["DEVELOPMENT", "Balance"], ["RoR", "Rate of rise"]].map(([label, caption], index) => <div className="roast-data" key={label}><span className="technical-label">0{index + 1}</span><strong>{label}</strong><span>{caption}</span><i style={{ width: `${[68, 48, 82, 60][index]}%` }} /></div>)}</div></div>
      </section>
      <section className="zero-craft zero-section"><div className="zero-photo-placeholder"><span>IMAGE SPACE</span><small>Roaster / green coffee / roast work</small></div><div className="zero-craft-copy"><p className="section-label">CRAFT + DATA</p><h2>Not automation.<br /><i>Not intuition alone.</i></h2><p>Every roast begins with the bean.</p><p className="zero-muted">Data helps us understand what happened.<br />Experience helps us decide what happens next.</p><p>Zero Degrees lives between the two.</p></div></section>
      <section className="zero-tominiko zero-section"><p className="section-label">FROM THE ROASTER</p><div className="zero-tominiko-grid"><h2>Roasted by Zero Degrees.<br /><i>Made to be TOMINIKO.</i></h2><div><p>The coffees we roast at Casa di Stefano are released through TOMINIKO Beans &amp; Coffee.</p><Link href="/shop" className="button-primary zero-button">SHOP TOMINIKO COFFEE ↗</Link></div></div></section>
      <section className="zero-signature"><p>ZERO DEGREES COFFEE ROASTERS</p><span>Nothing added.<br />Nothing hidden.</span><small>at CASA DI STEFANO</small></section>
    </main>
  );
}
