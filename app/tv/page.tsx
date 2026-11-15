import type { Metadata } from 'next';
import Link from 'next/link';
import AgentNoteNotice from '../components/agent-note-notice';

export const metadata: Metadata = {
  title: 'Making an Android TV less annoying — agent notes',
  description:
    'Working notes for my coding agents on Android TV remote buttons, voice-search handoff, reversible channel filters and phone installers. Not for human eyes.',
  alternates: { canonical: '/tv' },
};

export default function Page() {
  return (
    <section>
      <Link
        href="/"
        className="inline-block mb-8 text-neutral-600 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-100"
      >
        ← akshat
      </Link>
      <h1 className="font-medium text-2xl mb-8 tracking-tighter">
        making an android tv less annoying
      </h1>
      <AgentNoteNotice />
      <article className="prose prose-neutral dark:prose-invert">
        <p>
          I wanted a fairly ordinary thing from a Sony Android TV: hold the
          volume button to change the volume, press the remote&apos;s microphone
          button to search YouTube, and choose which channels show up. Getting
          those three things to coexist took more work than installing a
          replacement YouTube app.
        </p>
        <p>
          These are notes from a Sony BRAVIA KD-55X75K running Android 11, with
          2 GB of RAM and a 32-bit ARM app environment. They are not a universal
          debloating recipe. I kept the system image, Google recognition and
          existing account data, and made the changes reversible.
        </p>

        <h2>The volume problem was my key filter</h2>
        <p>
          An earlier accessibility service intercepted remote keys. Holding a
          volume button no longer repeated normally. Disabling that service
          restored held-volume repeat, which was confirmed on the actual remote.
        </p>
        <p>
          The replacement integration deliberately cannot request key-event
          filtering. It has no remote-button remapping and no{' '}
          <code>onKeyEvent</code> handler. I wanted to fix search, not become
          responsible for every button the TV receives.
        </p>

        <h2>Keep Google recognition, replace the broken handoff</h2>
        <p>
          I used <a href="https://github.com/reisxd/TizenTubeCobalt">TizenTube
          Cobalt</a> as the player. Direct playback worked, but clicking a video
          card in Google&apos;s TV search failed to launch it. The logs showed
          that Google could not start the result&apos;s activity intent.
          Making Cobalt a YouTube-link handler did not repair those
          package-targeted cards.
        </p>
        <p>
          A replacement-package bridge also hit{' '}
          <code>INSTALL_FAILED_VERSION_DOWNGRADE</code>. The factory YouTube
          package was still in the read-only system image even though it was
          removed for the current user. I did not try to bypass signatures,
          delete system files or root the TV. Experiments with alternative voice
          assistants were reverted; Google remained the recognizer.
        </p>
        <p>
          Instead, I built a small{' '}
          <a href="https://github.com/akshatagarwl/tv-search-handoff">
            search-handoff app
          </a>
          . After Google displays a completed query, the helper reads its search
          header and opens a Cobalt search URL. You then select a result inside
          Cobalt. It does not repair Google&apos;s cards or pretend to play the
          exact video from one of them.
        </p>
        <ul>
          <li>
            The header ID is{' '}
            <code>com.google.android.katniss:id/super_header</code>. A Google UI
            update can break this integration.
          </li>
          <li>
            On this Sony, <code>getRootInActiveWindow()</code> sometimes returns
            nothing while the header is visible. Retrieving interactive windows
            with <code>getWindows()</code> fixed that case.
          </li>
          <li>
            Retries are bounded, and duplicate suppression stops Back or a
            window-change event from immediately reopening the same search.
            There is no always-on polling.
          </li>
          <li>
            The helper has no Internet or microphone permission and does not
            persist or log queries. Accessibility access is still sensitive and
            must be enabled explicitly.
          </li>
        </ul>
        <p>
          This is not offline voice search: Google processes the speech and
          YouTube receives the search through the player. It also redirects
          non-video queries if Google displays them on that same results screen.
          That is a real limitation, not a general Assistant replacement.
        </p>

        <h2>A home tile, not another background service</h2>
        <p>
          A separate{' '}
          <a href="https://github.com/akshatagarwl/tv-youtube-shortcut">
            launcher shortcut
          </a>{' '}
          opens the preferred player, falling back to official Cobalt when
          necessary. It has no permissions, services or key interception. The
          public source uses original generic artwork rather than bundling a
          copied YouTube logo or my launcher configuration.
        </p>
        <p>
          The custom player uses a separate package identity from official
          Cobalt. Keeping them side by side avoids replacing an upstream-signed
          app with a locally signed APK and leaves a fallback available.
        </p>

        <h2>Channel filtering needs more than a title match</h2>
        <p>
          I extended the channel-blocking work from{' '}
          <a href="https://github.com/reisxd/TizenTube/pull/720">
            upstream PR #720
          </a>
          . My saved SmartTube preferences stay private. Optional community
          sources are a separate layer, with independent switches and local
          exceptions. An explicit personal block takes precedence over a
          community exception.
        </p>
        <p>
          Stable channel IDs are the primary match. Name aliases are only a
          fallback when an ID is missing, and can produce false positives.
          There are no blanket religious or political keywords, title regexes,
          imported JavaScript or claims that a channel list can determine truth.
        </p>
        <p>
          YouTube responses are not a flat list of videos. The filter handles
          channel cards, grouped results, continuations, Shorts metadata and
          owner information on shows, podcasts and playlists. Empty shelves need
          removing too. History, library and explicit-playlist exemptions are
          retained. This is preference filtering, not a playback-access barrier.
        </p>
        <p>
          Parsed indexes are cached rather than scanning tens of thousands of
          channels for every card. Configuration changes invalidate the cache,
          including changes that mutate an existing array in place.
        </p>

        <h2>The storage limit was the interesting constraint</h2>
        <p>
          The combined private snapshot has roughly 62,000 channel IDs. Each
          record carries a source-membership bitmask, so a channel appearing in
          several lists only needs one row. The payload is gzip-compressed and
          base64-encoded before going into localStorage.
        </p>
        <p>
          Base64 is not free, and this browser counts strings toward a quota in
          UTF-16 bytes. The deployed origin used about 4.57 MB of a 5.24 MB
          allowance. A compressed file looking small on disk is not enough to
          prove it will fit. The builder checks the packed size and rejects
          excessive shrinkage before replacing an existing output.
        </p>
        <p>
          The TV decoder also bounds packed input, decompressed bytes and record
          count. Source commits and file hashes are recorded for provenance.
          There are no automatic list updates: a published list and a snapshot
          already saved on the TV are different things.
        </p>
        <p>
          Importing storage is a maintenance operation, not something to do
          during somebody&apos;s film. Back up the current data, stop the app
          before an offline database edit, change only the intended keys, and
          preserve preferences and account state. Never clear or replace the
          whole profile as an import shortcut.
        </p>

        <h2>Open code does not make every dataset open</h2>
        <p>
          The <a href="https://github.com/akshatagarwl/tv-channel-lists">public
          list project</a> contains an MIT builder and my independently curated
          CC0 channel facts. It does not contain personal SmartTube exports,
          account profiles, fetched third-party datasets or the combined private
          snapshot.
        </p>
        <ul>
          <li>
            AiSList data retains its CC BY-NC 4.0 conditions. The warnlist is not
            imported.
          </li>
          <li>
            Redistribution licensing for SlopTube and MinimalTube is unconfirmed,
            so their fetched data is not republished.
          </li>
          <li>
            My curation requires manual approval and publishes minimal identity
            and evidence facts, not copied channel descriptions.
          </li>
        </ul>
        <p>
          These are optional preference filters, not authoritative bias or
          misinformation ratings. The TizenTube fork retains its upstream
          license; the builder&apos;s MIT license does not relicense either
          TizenTube or someone else&apos;s data.
        </p>

        <h2>Phone installers, with an honest preview boundary</h2>
        <p>
          I built a separate{' '}
          <a href="https://github.com/akshatagarwl/tv-setup">
            Android-phone and iPhone setup preview
          </a>
          . The Android app is native Java; the iPhone app is SwiftUI. Both use a
          shared catalog for optional official Cobalt, the voice helper and
          Proton VPN. Nothing is selected by default, and the helper requires
          the player.
        </p>
        <p>
          The flow is: connect, read compatibility information, preview the
          plan, wait for explicit idle-TV consent, verify the selected artifacts,
          then install only missing packages. The owner profile, Android version
          and supported app ABIs matter. A 64-bit processor does not prove the
          TV runs 64-bit apps.
        </p>
        <p>
          Existing apps are kept unchanged, even if the catalog has another
          version. Package presence is checked again just before installation.
          There are no reinstall flags, automatic app launches, accessibility
          grants, sign-ins, VPN connections or personal-list imports. The preview
          installs official Cobalt, not my custom filtering build, and does not
          configure the launcher.
        </p>
        <p>
          The transport currently supports classic network ADB on a trusted
          private IPv4 LAN, not Android&apos;s pairing-code/TLS protocol. An ADB
          authorization prompt may appear on the TV. Private-address validation
          is neither encryption nor proof of the TV&apos;s identity, so even
          connecting should wait for an appropriate setup window. Disable
          debugging when it is no longer needed.
        </p>
        <ul>
          <li>
            Downloads have byte-size, whole-file SHA-256 and publisher pins,
            with restricted HTTPS redirects and bounded protocol reads. The
            transport uses a single serialized stream.
          </li>
          <li>
            Release preparation verifies complete APK signatures with Android&apos;s{' '}
            <code>apksigner</code>. The iPhone verifier extracts the signing
            certificate after checking the whole-file hash; certificate
            extraction alone is not full signature verification. Android&apos;s
            package manager validates the APK when installing it.
          </li>
          <li>
            A pinned Cobalt APK does not pin everything it later runs: official
            Cobalt loads upstream web scripts. That supply-chain boundary is
            disclosed rather than hidden behind an APK checksum.
          </li>
          <li>
            Cancellation stops unfinished work, but the TV&apos;s package manager
            may finish an installation already submitted. Reconnect and check;
            there is no automatic destructive rollback.
          </li>
        </ul>
        <p>
          The <a href="https://github.com/akshatagarwl/tv-setup/releases/tag/v0.1.0-preview">
            Android phone preview APK
          </a>{' '}
          is debug-signed and not hardware-validated. Install it on the phone,
          not the TV. The iPhone source compiles for a simulator and a generic
          device, but there is no signed IPA or TestFlight release. Actual
          iPhone distribution still needs signing, provisioning and device tests.
        </p>

        <h2>VPN installation is not VPN verification</h2>
        <p>
          I installed the unmodified official Proton VPN app after checking its
          release hash, signature and TV compatibility. Sign-in and VPN consent
          remain on the TV. Credentials and QR tokens are not part of an
          installer or a public note.
        </p>
        <p>
          Installation and a reported sign-in do not establish that a tunnel
          works. Exit location, restricted-video playback, boot-time connection,
          LAN access and recovery after a disconnect still need testing. I did
          not silently connect it, buy a subscription, reroute traffic or enable
          always-on lockdown. Free-plan streaming and country availability are
          not guaranteed.
        </p>

        <h2>What is actually verified</h2>
        <ul>
          <li>
            On the TV: disabling key filtering restored held-volume repeat.
            Completed Google searches handed off to Cobalt, including repeated
            queries; navigation and selected playback worked.
          </li>
          <li>
            Filter source switches hid and restored reviewed results and
            survived restart. An allowed video played with an active media
            session and no reported playback error.
          </li>
          <li>
            The filter has 27 JavaScript tests and the public builder has nine
            Python tests. The installer was checked with 15 Swift tests, five
            Python tests and 89 Java checks, including fake ADB peers and local
            APK fixtures.
          </li>
          <li>
            The Android preview builds and its v2/v3 APK signatures verify. The
            iOS app compiles, but a successful compile is not a phone UI test.
            Installer development and tests did not contact a live TV or phone.
          </li>
        </ul>
        <p>
          Still pending: real phone-to-TV installation, foreground/background
          cancellation and partial-failure tests; a fresh physical microphone,
          held-volume and playback check on the final setup; VPN and reboot
          recovery; and a longer memory soak on this 2 GB TV. Sending an ADB
          Assistant intent cannot reproduce the remote&apos;s push-to-talk audio
          gate, so it is not a substitute for the microphone test.
        </p>
        <p>
          No root, system wipe, signature bypass or account-profile publication.
          Working playback is not an acceptable casualty of a background setup
          experiment.
        </p>

        <h2>Code</h2>
        <ul>
          <li>
            <a href="https://github.com/akshatagarwl/TizenTube/tree/feat/pr720-channel-block">
              TizenTube channel-filter fork
            </a>
          </li>
          <li>
            <a href="https://github.com/akshatagarwl/tv-channel-lists">
              Public curation and list builder
            </a>
          </li>
          <li>
            <a href="https://github.com/akshatagarwl/tv-search-handoff">
              Google-to-Cobalt search handoff
            </a>
          </li>
          <li>
            <a href="https://github.com/akshatagarwl/tv-youtube-shortcut">
              Permission-free launcher shortcut
            </a>
          </li>
          <li>
            <a href="https://github.com/akshatagarwl/tv-setup">
              Android and iPhone setup preview
            </a>
          </li>
        </ul>
      </article>
    </section>
  );
}
