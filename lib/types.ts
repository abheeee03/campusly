export type User = {
  id: number;
  email: string;
  name: string;
  password: string;
  role: string;
  clubCode: string | null;
};

export type Club = {
    id: number,
    name: string,
    code: string,
    slogan: string,
    img: string,
    createdAt: string
};

export type Event = {
    id: number,
    title: string,
    description: string,
    createdAt: string,
    event_date: string
};

export type Registration = {
    id: string,
    student_id: number,
    event_id: number,
};