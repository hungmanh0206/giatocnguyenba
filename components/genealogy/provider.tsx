'use client';
import { createContext, useContext, useState, type ReactNode } from 'react';
import { seedMembers, validateMember, type Member } from '@/lib/family';
const FamilyContext = createContext<{
  members: Member[];
  save: (p: Member) => string | null;
  reset: () => void;
}>({ members: seedMembers, save: () => null, reset: () => {} });
export function FamilyProvider({ children }: { children: ReactNode }) {
  const [members, setMembers] = useState(seedMembers);
  function save(person: Member) {
    const error = validateMember(person, members);
    if (error) return error;
    setMembers((current) => [
      ...current
        .filter((p) => p.id !== person.id)
        .map((p) => ({
          ...p,
          spouses: person.spouses.includes(p.id)
            ? [...new Set([...p.spouses, person.id])]
            : p.spouses.filter((id) => id !== person.id),
        })),
      person,
    ]);
    return null;
  }
  return (
    <FamilyContext.Provider
      value={{ members, save, reset: () => setMembers(seedMembers) }}
    >
      {children}
    </FamilyContext.Provider>
  );
}
export const useFamily = () => useContext(FamilyContext);
