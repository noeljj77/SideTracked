// Everything that imports the Firebase SDK lives here. Load it with `import()` so the
// SDK stays out of the main bundle and only downloads when accounts are switched on.
import { initializeApp } from 'firebase/app'
import { GoogleAuthProvider, getAuth, onAuthStateChanged, signInWithPopup, signOut } from 'firebase/auth'
import { collection, deleteDoc, doc, getFirestore, onSnapshot, setDoc } from 'firebase/firestore'
import { z } from 'zod'
import type { AuthUser } from '@/domain/account'
import type { TrailsRepo } from '@/domain/trails'
import { firebaseConfig } from './config'

const app = initializeApp(firebaseConfig)
const auth = getAuth(app)
const db = getFirestore(app)

export function watchAuth(onUser: (user: AuthUser | null) => void) {
  return onAuthStateChanged(auth, (u) =>
    onUser(
      u
        ? {
            uid: u.uid,
            name: u.displayName ?? u.email ?? 'Explorer',
            email: u.email ?? '',
            photo: u.photoURL ?? undefined,
          }
        : null,
    ),
  )
}

export const signIn = async () => {
  await signInWithPopup(auth, new GoogleAuthProvider())
}

export const signOutUser = () => signOut(auth)

const trailDoc = z.object({ steps: z.array(z.string()), savedAt: z.number() })

const trails = (uid: string) => collection(db, 'users', uid, 'trails')

export const trailsRepo: TrailsRepo = {
  subscribe: (uid, onTrails, onError) =>
    onSnapshot(
      trails(uid),
      (snap) =>
        onTrails(
          snap.docs.flatMap((d) => {
            const parsed = trailDoc.safeParse(d.data())
            return parsed.success ? [{ id: d.id, ...parsed.data }] : [] // skip malformed documents
          }),
        ),
      onError,
    ),
  upsert: (uid, t) => setDoc(doc(trails(uid), t.id), { steps: t.steps, savedAt: t.savedAt }),
  remove: (uid, id) => deleteDoc(doc(trails(uid), id)),
}
