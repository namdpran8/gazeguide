export type BoundingBox = [number, number, number, number];

export interface SelectedObject {
  id: string;
  label: string;
  description: string;
  region: BoundingBox; 
}

export interface Scene {
  scene_id: string;
  timestamp_seconds: number;
  title: string;
  description: string;
  objects: SelectedObject[];
}

export interface Lesson {
  lesson_id: string;
  title: string;
  description: string;
  asset?: string;
  scenes: Scene[];
}

export interface ExplainRequest {
  lesson_id: string;
  scene_id: string;
  selected_object_id: string;
  question?: string;
}

export interface ExplainResponse {
  title: string;
  explanation: string;
  analogy: string;
  follow_up: string[];
  source_note: string;
  fallback: boolean;
}

export interface ApiState {
  loading: boolean;
  data: ExplainResponse | null;
  error: string | null;
}
