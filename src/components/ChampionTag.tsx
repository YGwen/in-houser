import { championById, championIcon } from '../champions';

/** Portrait + name of a randomly picked champion. */
export default function ChampionTag({ id, large = false }: { id: string | undefined; large?: boolean }) {
  const champ = id ? championById(id) : undefined;
  if (!champ) return null;
  return (
    <span className={`champ-tag ${large ? 'large' : ''}`} title={`Random champion: ${champ.name}`}>
      <img src={championIcon(champ.id)} alt="" width={large ? 44 : 22} height={large ? 44 : 22} loading="eager" />
      <span>{champ.name}</span>
    </span>
  );
}
