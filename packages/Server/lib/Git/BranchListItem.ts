export default class BranchListItem {
    current: boolean;
    name: string;
    latestCommit: string;
    behindBy: number;
    aheadBy: number;

    constructor(current: boolean, name: string, latestCommit: string, behindBy: number, aheadBy: number) {
        this.current = current;
        this.name = name;
        this.latestCommit = latestCommit;
        this.behindBy = behindBy;
        this.aheadBy = aheadBy;
    }
}