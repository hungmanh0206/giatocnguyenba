import type { Member } from '@/lib/family';

export function Avatar({
  person,
  large = false,
}: {
  person: Member;
  large?: boolean;
}) {
  const avatarSource =
    person.gender === 'female'
      ? '/avatar-female-3d.png'
      : person.gender === 'male'
        ? '/avatar-male-3d.png'
        : null;

  return (
    <span
      aria-hidden="true"
      className={`avatar ${person.gender} ${large ? 'large' : ''}`}
    >
      {avatarSource ? (
        <img className="avatar-art" src={avatarSource} alt="" />
      ) : (
        <span className="avatar-unknown">?</span>
      )}
    </span>
  );
}
