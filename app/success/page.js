export default function SuccessPage() {
  return (
    <main className="success">
      <p className="eyebrow">CHECKOUT COMPLETE</p>
      <h1>ORDER<br />RECEIVED.</h1>
      <p>Your payment is being confirmed securely. Your license and protected downloads are issued only after Stripe confirms payment through the store's signed webhook.</p>
      <a className="primary" href="/">BACK TO BEATS</a>
    </main>
  );
}
