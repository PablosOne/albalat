import type { Bilingual, BilingualParagraphs } from './site';

export type GuitarNoteKind = 'trick' | 'sound' | 'guitars';

export interface GuitarNote {
  id: string;
  kind: GuitarNoteKind;
  title: Bilingual;
  summary: Bilingual;
  body: BilingualParagraphs;
}

export const guitarNotes = [
  {
    id: 'daily-sound',
    kind: 'sound',
    title: {
      es: 'El sonido empieza antes de la nota',
      en: 'Sound begins before the note',
    },
    summary: {
      es: 'Una mirada breve a la preparacion, el contacto y la respiracion de la frase.',
      en: 'A short reflection on preparation, contact, and the breath of a phrase.',
    },
    body: {
      es: [
        'El sonido de la guitarra no depende solo de la pulsacion. Empieza en la escucha previa: imaginar la calidad de la nota antes de tocarla cambia la mano, el peso y la intencion.',
        'La mano derecha trabaja mejor cuando evita la prisa. Preparar el dedo, sentir la cuerda y liberar el sonido con naturalidad permite que cada frase conserve direccion.',
      ],
      en: [
        'The sound of the guitar does not depend only on the stroke. It begins in listening: imagining the quality of the note before playing it changes the hand, the weight, and the intention.',
        'The right hand works best without haste. Preparing the finger, feeling the string, and releasing the sound naturally helps each phrase keep its direction.',
      ],
    },
  },
  {
    id: 'practice-clarity',
    kind: 'trick',
    title: {
      es: 'Practicar con claridad',
      en: 'Practising with clarity',
    },
    summary: {
      es: 'Ideas de estudio para que la tecnica sirva siempre al discurso musical.',
      en: 'Practice ideas so technique remains in service of the musical line.',
    },
    body: {
      es: [
        'Un pasaje dificil rara vez se resuelve repitiendolo entero muchas veces. Conviene aislar el gesto, reducir la velocidad y decidir que debe escucharse con prioridad.',
        'La medida del progreso no es tocar mas rapido, sino tocar con menos tension y con una idea musical mas clara.',
      ],
      en: [
        'A difficult passage is rarely solved by repeating the whole passage many times. It helps to isolate the gesture, reduce the tempo, and decide what must be heard first.',
        'Progress is not measured only by speed, but by less tension and a clearer musical idea.',
      ],
    },
  },
  {
    id: 'cedar-spruce',
    kind: 'guitars',
    title: {
      es: 'Cedro, abeto y respuesta',
      en: 'Cedar, spruce, and response',
    },
    summary: {
      es: 'Notas sobre caracter, proyeccion y eleccion del instrumento.',
      en: 'Notes on character, projection, and choosing an instrument.',
    },
    body: {
      es: [
        'Cada guitarra propone una relacion distinta con el interprete. El cedro suele ofrecer una respuesta inmediata y calida; el abeto puede abrir un arco amplio de color y proyeccion con el tiempo.',
        'La eleccion no deberia reducirse a una madera. Importan el equilibrio, la comodidad, la claridad entre voces y la manera en que el instrumento invita a frasear.',
      ],
      en: [
        'Every guitar proposes a different relationship with the player. Cedar often gives an immediate, warm response; spruce can open a wide range of colour and projection over time.',
        'The choice should not be reduced to one wood. Balance, comfort, clarity between voices, and the way the instrument invites phrasing all matter.',
      ],
    },
  },
] satisfies GuitarNote[];
