export interface SearchResult {
    id: string;
    payload: any;
    score: number;
    explanation: string;
}

export interface SearchCandidate {
    id: string;
    score: number;
    rowId?: string;
}
