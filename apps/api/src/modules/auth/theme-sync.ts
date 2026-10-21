import { Injectable } from '@nestjs/common';
import type { WebSocket } from 'ws';

export type ThemeName = 'day' | 'night';

type ThemeClient = WebSocket & { userId?: string };

@Injectable()
export class ThemeSync {
  private readonly clients = new Map<string, Set<ThemeClient>>();

  add(userId: string, client: WebSocket) {
    const themeClient = client as ThemeClient;
    themeClient.userId = userId;
    const group = this.clients.get(userId) ?? new Set<ThemeClient>();
    group.add(themeClient);
    this.clients.set(userId, group);
  }

  remove(client: WebSocket) {
    const themeClient = client as ThemeClient;
    const userId = themeClient.userId;
    if (!userId) return;
    const group = this.clients.get(userId);
    group?.delete(themeClient);
    if (group && group.size === 0) {
      this.clients.delete(userId);
    }
  }

  publish(userId: string, theme: ThemeName) {
    const message = JSON.stringify({ event: 'theme', data: { theme } });
    for (const client of this.clients.get(userId) ?? []) {
      if (client.readyState === client.OPEN) {
        client.send(message);
      }
    }
  }
}
