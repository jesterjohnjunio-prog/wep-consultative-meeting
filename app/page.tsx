import Image from 'next/image';
import RegistrationForm from '@/components/form/RegistrationForm';
import { Calendar, Clock, MapPin } from '@/components/Icons';
import Splash from '@/components/Splash';
import WaterBackground from '@/components/WaterBackground';
import { EVENT } from '@/lib/config';

export default function Home() {
  return (
    <>
      <WaterBackground />
      <Splash />
      <main className="page">
        <header className="hero">
          <div className="logo-bar">
            <Image
              src="/mwss-ro-logo.png"
              alt="MWSS Regulatory Office"
              width={1694}
              height={369}
              priority
              className="logo-mwss"
            />
            <span className="logo-divider" aria-hidden="true" />
            <Image src="/wep-logo.png" alt="Water Efficiency Program" width={725} height={987} priority className="logo-wep" />
          </div>

          <h1 className="hero-title">
            Barangay Consultative Meeting
            <span>MWSS RO Water Efficiency Program</span>
          </h1>

          <ul className="event-chips" aria-label="Event details">
            <li>
              <Calendar />
              {EVENT.dateEn}
            </li>
            <li>
              <Clock />
              {EVENT.time}
            </li>
            <li>
              <MapPin />
              {EVENT.venue}
            </li>
          </ul>
        </header>

        <RegistrationForm />

        <footer className="page-foot">
          <p>
            Metropolitan Waterworks and Sewerage System — Regulatory Office
            <span>Water Efficiency Program · {new Date().getFullYear()}</span>
          </p>
        </footer>
      </main>
    </>
  );
}
