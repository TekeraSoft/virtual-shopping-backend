
interface IInvitation {
    id: string;
    userId: string;
    friendId: string;
}

export class InvitationService {
    // Map kullanarak daha verimli lookup
    private static friendInvitations: Map<string, IInvitation> = new Map();
    // Index'ler için ek Map'ler - daha hızlı sorgular için
    private static inviterIndex: Map<string, Set<string>> = new Map();
    private static invitedIndex: Map<string, Set<string>> = new Map();

    static async createInvitation(userId: string, friendId: string) {
        // Duplicate kontrolü
        const existingKey = `${userId}-${friendId}`;
        if (this.friendInvitations.has(existingKey)) {
            throw new Error('Invitation already exists');
        }

        const newInvitation: IInvitation = {
            id: crypto.randomUUID(),
            userId,
            friendId
        };
        
        // Ana Map'e kaydet
        this.friendInvitations.set(existingKey, newInvitation);
        
        // Index'leri güncelle
        if (!this.inviterIndex.has(userId)) {
            this.inviterIndex.set(userId, new Set());
        }
        this.inviterIndex.get(userId)!.add(existingKey);
        
        if (!this.invitedIndex.has(friendId)) {
            this.invitedIndex.set(friendId, new Set());
        }
        this.invitedIndex.get(friendId)!.add(existingKey);
        
        return newInvitation;
    }
    
    static getInvitationsForInviter(userId: string): IInvitation[] {
        const invitationKeys = this.inviterIndex.get(userId);
        if (!invitationKeys) return [];
        
        return Array.from(invitationKeys)
            .map(key => this.friendInvitations.get(key))
            .filter((invitation): invitation is IInvitation => invitation !== undefined);
    }

    static getInvitationsForInvited(friendId: string): IInvitation[] {
        const invitationKeys = this.invitedIndex.get(friendId);
        if (!invitationKeys) return [];
        
        return Array.from(invitationKeys)
            .map(key => this.friendInvitations.get(key))
            .filter((invitation): invitation is IInvitation => invitation !== undefined);
    }

    static async removeInvitation(userId: string, friendId: string) {
        const key = `${userId}-${friendId}`;
        const invitation = this.friendInvitations.get(key);
        
        if (invitation) {
            // Ana Map'ten sil
            this.friendInvitations.delete(key);
            
            // Index'lerden temizle
            this.inviterIndex.get(userId)?.delete(key);
            this.invitedIndex.get(friendId)?.delete(key);
            
            // Boş Set'leri temizle
            if (this.inviterIndex.get(userId)?.size === 0) {
                this.inviterIndex.delete(userId);
            }
            if (this.invitedIndex.get(friendId)?.size === 0) {
                this.invitedIndex.delete(friendId);
            }
            
            return true;
        }
        return false;
    }
    
    // Utility metodları
    static getAllInvitations(): IInvitation[] {
        return Array.from(this.friendInvitations.values());
    }
    
    static getInvitationCount(): number {
        return this.friendInvitations.size;
    }
    
    static clearAllInvitations(): void {
        this.friendInvitations.clear();
        this.inviterIndex.clear();
        this.invitedIndex.clear();
    }
}