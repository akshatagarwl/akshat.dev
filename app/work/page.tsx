export default function Page() {
  return (
    <section>
      <h1 className="font-medium text-2xl mb-8 tracking-tighter">my work</h1>
      <div className="prose prose-neutral dark:prose-invert">
        <p>
          I've had the chance to work with some wonderful teams on diverse
          problems and tech stacks, which has allowed me to learn and grow
          continuously. Here’s a brief overview of my professional experience so
          far:
        </p>
        <hr className="my-6 border-neutral-100 dark:border-neutral-800" />
        <h2 className="font-medium text-xl mb-1 tracking-tighter">Aurva</h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm">
          Software Engineer, 2023 — Present
        </p>
        <p>
          I am currently employed at <a href="https://aurva.io/">Aurva</a>,
          where my primary responsibility is building Aurva's eBPF collector, a
          crucial component of our dataplane that operates within our customers'
          environments. This collector provides essential functionalities,
          including:
        </p>
        <ul>
          <li>
            Egress monitoring: Monitoring and analyzing outbound network
            traffic.
          </li>
          <li>
            Database activity monitoring: Tracking and recording database
            operations.
          </li>
          <li>
            Sensitive data detection: Identifying and protecting sensitive
            information.
          </li>
          <li>
            Service discovery: Automatically detecting and mapping services
            within the customer's infrastructure.
          </li>
        </ul>
        <p>
          Since I joined Aurva in 2023, I have been part of the team that has
          grown the product from the ground up, taking it from zero to one. We
          have accomplished significant growth, expanding from a nascent stage
          to becoming a trusted solution for companies like Razorpay, Jupiter,
          and others.
        </p>
        <hr className="my-6 border-neutral-100 dark:border-neutral-800" />
        <h2 className="font-medium text-xl mb-1 tracking-tighter">Headout</h2>
        <p className="text-neutral-600 dark:text-neutral-400 text-sm">
          Software Engineer, 2022 — 2023
        </p>
        <p>
          Headout is a travel technology startup dedicated to providing
          delightful experiences for its users. I was a member of the
          post-purchase team, responsible for all aspects following a customer's
          booking.
        </p>
        <p>As the primary backend developer, my contributions included:</p>
        <ul>
          <li>
            <a href="https://www.headout.com/help/">Manage My Bookings</a>: A
            self-serving portal that allowed customers to manage their bookings
            independently. This initiative successfully reduced the booking
            cancelled due to Headout by a 74%, translating to cost savings of
            approximately $18,000 per week at a Gross Booking Value (GBV) of
            $80,000.
          </li>
          <li>
            Audio Guides in the Headout App: This led to a 15% improvement in
            ratings for top audio guide products.
          </li>
        </ul>
      </div>
    </section>
  );
}
