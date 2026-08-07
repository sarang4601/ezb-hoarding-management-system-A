import { initializeApp } from 'firebase/app';
import {
  getFirestore,
  collection,
  doc,
  getDocs,
  setDoc,
  updateDoc,
  deleteDoc,
  onSnapshot,
  writeBatch,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';
import { Agency, Hoarding, QuarterlyFee, StabilityCertificate, TpScheme } from '../types';
import { initialAgencies, initialHoardings, initialQuarterlyFees, initialStabilityCertificates, initialTpSchemes } from '../data/mockData';

// Initialize Firebase App & Firestore
const app = initializeApp(firebaseConfig);
export const db = getFirestore(
  app,
  firebaseConfig.firestoreDatabaseId || '(default)'
);

// Collection References
export const AGENCIES_COL = 'agencies';
export const HOARDINGS_COL = 'hoardings';
export const QUARTERLY_FEES_COL = 'quarterlyFees';
export const STABILITY_CERTS_COL = 'stabilityCertificates';
export const TP_SCHEMES_COL = 'tpSchemes';

// Seed Initial Data if collections are empty
export async function seedInitialFirestoreData() {
  try {
    const tpSnap = await getDocs(collection(db, TP_SCHEMES_COL));
    if (tpSnap.empty) {
      console.log('Seeding initial TP schemes into Firestore...');
      const batch = writeBatch(db);
      initialTpSchemes.forEach((tp) => {
        batch.set(doc(db, TP_SCHEMES_COL, tp.id), tp);
      });
      await batch.commit();
    }
  } catch (e) {
    console.error('Error seeding initial Firestore data:', e);
  }
}

// --- Firestore CRUD Functions ---

// Agencies
export function subscribeAgencies(callback: (agencies: Agency[]) => void) {
  return onSnapshot(
    collection(db, AGENCIES_COL),
    (snapshot) => {
      const items: Agency[] = snapshot.docs.map((d) => d.data() as Agency);
      callback(items);
    },
    (err) => console.error('Agencies snapshot error:', err)
  );
}

export async function saveAgency(agency: Agency) {
  await setDoc(doc(db, AGENCIES_COL, agency.id), agency, { merge: true });
}

export async function deleteAgency(id: string) {
  await deleteDoc(doc(db, AGENCIES_COL, id));
}

// Hoardings
export function subscribeHoardings(callback: (hoardings: Hoarding[]) => void) {
  return onSnapshot(
    collection(db, HOARDINGS_COL),
    (snapshot) => {
      const items: Hoarding[] = snapshot.docs.map((d) => d.data() as Hoarding);
      callback(items);
    },
    (err) => console.error('Hoardings snapshot error:', err)
  );
}

export async function saveHoarding(hoarding: Hoarding) {
  await setDoc(doc(db, HOARDINGS_COL, hoarding.id), hoarding, { merge: true });
}

export async function updateHoarding(id: string, data: Partial<Hoarding>) {
  await updateDoc(doc(db, HOARDINGS_COL, id), data);
}

// Quarterly Fees
export function subscribeQuarterlyFees(callback: (fees: QuarterlyFee[]) => void) {
  return onSnapshot(
    collection(db, QUARTERLY_FEES_COL),
    (snapshot) => {
      const items: QuarterlyFee[] = snapshot.docs.map((d) => d.data() as QuarterlyFee);
      callback(items);
    },
    (err) => console.error('Quarterly fees snapshot error:', err)
  );
}

export async function saveQuarterlyFee(fee: QuarterlyFee) {
  await setDoc(doc(db, QUARTERLY_FEES_COL, fee.id), fee, { merge: true });
}

export async function updateQuarterlyFee(id: string, data: Partial<QuarterlyFee>) {
  await updateDoc(doc(db, QUARTERLY_FEES_COL, id), data);
}

export async function deleteQuarterlyFee(id: string) {
  await deleteDoc(doc(db, QUARTERLY_FEES_COL, id));
}

// Stability Certificates
export function subscribeStabilityCertificates(
  callback: (certs: StabilityCertificate[]) => void
) {
  return onSnapshot(
    collection(db, STABILITY_CERTS_COL),
    (snapshot) => {
      const items: StabilityCertificate[] = snapshot.docs.map(
        (d) => d.data() as StabilityCertificate
      );
      callback(items);
    },
    (err) => console.error('Stability certs snapshot error:', err)
  );
}

export async function saveStabilityCertificate(cert: StabilityCertificate) {
  await setDoc(doc(db, STABILITY_CERTS_COL, cert.id), cert, { merge: true });
}

export async function updateStabilityCertificate(
  id: string,
  data: Partial<StabilityCertificate>
) {
  await updateDoc(doc(db, STABILITY_CERTS_COL, id), data);
}

// TP Schemes
export function subscribeTpSchemes(callback: (schemes: TpScheme[]) => void) {
  return onSnapshot(
    collection(db, TP_SCHEMES_COL),
    (snapshot) => {
      const items: TpScheme[] = snapshot.docs.map((d) => d.data() as TpScheme);
      callback(items);
    },
    (err) => console.error('TP Schemes snapshot error:', err)
  );
}

export async function saveTpScheme(scheme: TpScheme) {
  await setDoc(doc(db, TP_SCHEMES_COL, scheme.id), scheme, { merge: true });
}

export async function deleteTpScheme(id: string) {
  await deleteDoc(doc(db, TP_SCHEMES_COL, id));
}

// Clear all collections in Firestore (Wipe dummy data)
export async function clearAllFirestoreData() {
  try {
    const agSnap = await getDocs(collection(db, AGENCIES_COL));
    const hrdSnap = await getDocs(collection(db, HOARDINGS_COL));
    const qfSnap = await getDocs(collection(db, QUARTERLY_FEES_COL));
    const stbSnap = await getDocs(collection(db, STABILITY_CERTS_COL));
    const tpSnap = await getDocs(collection(db, TP_SCHEMES_COL));

    const batch = writeBatch(db);

    agSnap.docs.forEach((d) => batch.delete(d.ref));
    hrdSnap.docs.forEach((d) => batch.delete(d.ref));
    qfSnap.docs.forEach((d) => batch.delete(d.ref));
    stbSnap.docs.forEach((d) => batch.delete(d.ref));
    tpSnap.docs.forEach((d) => batch.delete(d.ref));

    await batch.commit();
    console.log('All Firestore dummy data cleared successfully.');
  } catch (e) {
    console.error('Error clearing Firestore data:', e);
  }
}

// Reset data in Firestore back to sample initial state
export async function resetFirestoreToSampleData() {
  await clearAllFirestoreData();

  const batch = writeBatch(db);
  initialAgencies.forEach((ag) => batch.set(doc(db, AGENCIES_COL, ag.id), ag));
  initialHoardings.forEach((hrd) => batch.set(doc(db, HOARDINGS_COL, hrd.id), hrd));
  initialQuarterlyFees.forEach((qf) => batch.set(doc(db, QUARTERLY_FEES_COL, qf.id), qf));
  initialStabilityCertificates.forEach((stb) =>
    batch.set(doc(db, STABILITY_CERTS_COL, stb.id), stb)
  );

  await batch.commit();
}
