import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Locking down a Qin F21 Pro',
  description:
    'Auditing and hardening a Qin F21 Pro keypad phone over ADB, without root.',
  alternates: { canonical: '/qin' },
};

export default function Page() {
  return (
    <section>
      <h1 className="font-medium text-2xl mb-8 tracking-tighter">
        locking down a qin f21 pro
      </h1>
      <article className="prose prose-neutral dark:prose-invert">
        <p>
          The Qin F21 Pro is a small Android keypad phone made by Duoqin. I
          wanted to keep using it for banking, UPI and 2FA, so I audited it
          over USB with <code>adb</code> and changed what I could without
          rooting it. Rooting, unlocking the bootloader or flashing a custom ROM
          would break banking apps, so all of that was ruled out from the
          start.
        </p>
        <p>
          The audit was read-only until I chose each change. Nothing from the
          phone left my laptop.
        </p>

        <h2>The phone</h2>
        <ul>
          <li>Android 11 on a MediaTek MT6761, firmware built November 2025.</li>
          <li>
            Security patch level <strong>2022-06-05</strong>. This is the
            biggest risk, and nothing on the phone can fix it.
          </li>
          <li>
            Bootloader locked and verified boot green, with SELinux enforcing,
            file-based encryption, release keys and a non-debuggable build. I
            found no root.
          </li>
          <li>
            223 packages: 219 system and 4 installed from Play. No device
            admins, no device owner and no VPN were configured.
          </li>
        </ul>

        <h2>Looking for backdoors</h2>
        <p>
          I checked per-app network usage, open ports, running processes,
          boot-time services, accessibility services, notification listeners,
          device admins and the system framework. Here&apos;s what turned up:
        </p>
        <ul>
          <li>No TCP ports were listening.</li>
          <li>
            Google Play and Play Services used the most data, which is normal.
            Nothing unknown stood out.
          </li>
          <li>
            The firmware includes Duoqin&apos;s factory and diagnostic apps,
            MediaTek&apos;s engineering tools and a modem logger. They are
            preinstalled and can&apos;t be removed.
          </li>
          <li>
            <code>services.jar</code> contains code for a &quot;Duoqin
            Guard&quot; app-blocking feature. Its build flag is empty and its
            settings are unset, so it doesn&apos;t look active on this unit.
          </li>
        </ul>
        <p>
          None of that proves the phone is clean. Without root, an audit only
          sees what Android lets the shell see. To fill the gap, the phone now
          runs a local traffic capture for a few days (more on that below).
        </p>

        <h2>What the ROM blocks</h2>
        <p>
          This firmware rejects package management over ADB. Commands such as{' '}
          <code>pm uninstall</code>, <code>pm disable-user</code>,{' '}
          <code>pm revoke</code> and <code>adb install</code> all just print{' '}
          <code>Failure</code>. Owners on the Qin forums report the same
          thing. Everything below went through the phone&apos;s own Settings
          and installer screens, driven with <code>input tap</code> and{' '}
          <code>uiautomator dump</code>, or through <code>settings</code>,{' '}
          <code>ime</code> and <code>appops</code>, which still work.
        </p>

        <h2>Settings changed</h2>
        <p>Before changing anything, I saved the old values so each change can be undone.</p>
        <ul>
          <li>Automatic date, time and time zone turned on.</li>
          <li>
            Private DNS set to <code>dns.adguard-dns.com</code>. If a bank app
            misbehaves, set it back to Automatic.
          </li>
          <li>Notification contents hidden on the lock screen.</li>
          <li>Screen timeout cut from 60 to 30 seconds.</li>
          <li>Installing from unknown sources stays blocked, and Bluetooth stays off.</li>
          <li>
            The Files app got permission to install one APK, which was revoked
            right after.
          </li>
        </ul>

        <h2>Keyboards</h2>
        <p>
          The phone came with Gboard and Duoqin Pinyin. I tried
          FUTO Keyboard and HeliBoard as touchscreen keyboards and then settled
          on a single keyboard,{' '}
          <a href="https://github.com/sspanak/tt9">Traditional T9</a>
          , which is Apache-2.0 and made for keypads.
        </p>
        <ul>
          <li>TT9 is installed and set as the only active keyboard.</li>
          <li>FUTO Keyboard and HeliBoard are uninstalled.</li>
          <li>
            Gboard&apos;s updates are uninstalled, and the built-in Gboard Go
            copy is disabled. It lives in the read-only system partition, so
            deleting it would need root.
          </li>
          <li>Duoqin Pinyin is disabled.</li>
        </ul>

        <h2>Apps</h2>
        <ul>
          <li>
            <strong>YouTube</strong> is disabled.
          </li>
          <li>
            <a href="https://github.com/emanuele-f/PCAPdroid">PCAPdroid</a>{' '}
            (GPL-3.0, installed from Play) captures every app&apos;s
            connections through a local VPN, with HTTPS decryption off and no
            certificate installed. Play Store and GitHub builds can&apos;t be
            installed side by side. I verified the capture is running and that
            Private DNS still works through it.
          </li>
          <li>
            <a href="https://github.com/iodn/android-ir-blaster">
              IR Blaster Remote
            </a>{' '}
            (GPL-3.0, Play) drives the phone&apos;s IR blaster. It requests
            camera and microphone access. The microphone is for learning codes
            from a remote by sound. Both are left ungranted. I found no analytics SDK in its source, and it uses the
            network for GitHub update checks.
          </li>
          <li>
            <a href="https://github.com/beemdevelopment/Aegis">Aegis</a> is
            installed alongside Authy. Authy stays until every account has been re-enrolled in
            Aegis, because Authy has no official export.
          </li>
        </ul>

        <h2>Factory apps that can&apos;t be disabled</h2>
        <p>
          Seven preinstalled apps have a greyed-out Disable button, and their
          permissions are fixed by the system:
        </p>
        <ul>
          <li>
            Duoqin&apos;s <code>factory_test</code>, <code>mmi_test</code>,{' '}
            <code>hardwareinfo</code> and <code>compatiblemark</code>
          </li>
          <li>
            MediaTek&apos;s <code>engineermode</code> and <code>ygps</code>
          </li>
          <li>
            <code>com.debug.loggerui</code>
          </li>
        </ul>
        <p>
          Four of them (the Duoqin ones) share the system phone identity,{' '}
          <code>android.uid.phone</code>, with the dialer and SMS stack. Blocking
          them by package wouldn&apos;t contain a process that already holds the
          phone app&apos;s privileges. Blocking that identity as a whole would
          break calls and SMS. I left them alone and undid one test block.
        </p>
        <p>
          The other three each have their own identity, so I blocked them with{' '}
          <code>appops</code>:
        </p>
        <ul>
          <li>
            <code>engineermode</code>: camera, microphone, phone state and
            approximate location.
          </li>
          <li>
            <code>ygps</code>: approximate location.
          </li>
          <li>
            <code>loggerui</code>: camera and microphone.
          </li>
        </ul>
        <p>
          A plain per-package <code>appops set</code> was silently dropped for
          several of these. Setting the mode on the app&apos;s own uid (
          <code>appops set --uid</code>) stuck. Precise location (
          <code>FINE_LOCATION</code>) wouldn&apos;t stick either way, and a
          storage block only held per package, not on the uid, so I don&apos;t
          count it. The cost is that the phone&apos;s built-in hardware tests
          may not work for a repair shop. To undo a block, run{' '}
          <code>appops set --uid &lt;package&gt; &lt;op&gt; default</code>.
        </p>

        <h2>Still to do</h2>
        <p>Roughly in order of how much each one helps:</p>
        <ol>
          <li>
            Install firmware updates whenever Duoqin ships them, and check the
            updater by hand. The 2022 patch level is the real problem: a
            malicious web page or message can reach years of fixed bugs.
          </li>
          <li>
            Turn off USB debugging and developer options once the audit is
            done. With ADB on, anyone holding the unlocked phone and a cable
            gets a shell.
          </li>
          <li>
            Let PCAPdroid run for two or three days, then export the
            connections and review them. Any Duoqin or unexpected server it
            finds can be blocked with a DNS blocklist.
          </li>
          <li>
            Move every 2FA account from Authy to Aegis, keep an encrypted
            backup off the phone, then remove Authy.
          </li>
          <li>
            Use a screen PIN of at least 6 digits, add a SIM PIN, and turn on
            Play Protect and Find My Device.
          </li>
          <li>
            Take location, camera, microphone and contacts away from Chrome
            and Google Messages unless they&apos;re needed. Both had them
            granted by default. Keep location off when not in use.
          </li>
          <li>
            In the Google account, delete the advertising ID and turn off
            Web &amp; App Activity, Location History and usage &amp;
            diagnostics.
          </li>
          <li>Set low UPI limits and turn on transaction alerts.</li>
        </ol>

        <h2>What I didn&apos;t do</h2>
        <p>
          No root, no bootloader unlock and no custom ROM. LineageOS-based
          builds for this phone exist, but they need an unlocked bootloader and
          spoofing to pass integrity checks. That trade-off is wrong for a phone
          used for UPI. I also didn&apos;t delete anything from the system
          partition. Some community debloat lists remove the dialer, providers
          and updater, and one Qin owner reports that removing the weather app
          breaks SystemUI.
        </p>
      </article>
    </section>
  );
}
