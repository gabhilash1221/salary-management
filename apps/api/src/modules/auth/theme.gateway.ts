import type { IncomingMessage } from 'node:http';
import { Logger } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { type OnGatewayConnection, WebSocketGateway } from '@nestjs/websockets';
import type { WebSocket } from 'ws';
import { PrismaService } from '../../prisma/prisma.service';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth-user';
import { readThemeMessage } from './profile-media';
import { ThemeSync } from './theme-sync';

@WebSocketGateway({ path: '/api/v1/theme' })
export class ThemeGateway implements OnGatewayConnection {
  private readonly logger = new Logger(ThemeGateway.name);

  constructor(
    private readonly jwt: JwtService,
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
    private readonly themes: ThemeSync,
  ) {}

  handleConnection(client: WebSocket, request: IncomingMessage) {
    void this.join(client, request);
  }

  private async join(client: WebSocket, request: IncomingMessage) {
    try {
      const url = new URL(request.url ?? '', 'http://localhost');
      const token = url.searchParams.get('token');
      if (!token) {
        client.close();
        return;
      }
      const payload = await this.jwt.verifyAsync<AuthUser>(token);
      const user = await this.prisma.user.findUnique({
        where: { id: payload.userId },
      });
      if (!user?.isActive) {
        client.close();
        return;
      }
      this.themes.add(user.id, client);
      client.send(
        JSON.stringify({
          event: 'theme',
          data: { theme: user.theme === 'night' ? 'night' : 'day' },
        }),
      );
      client.on('message', (raw) => {
        const theme = readThemeMessage(raw.toString());
        if (!theme) return;
        void this.auth.setTheme(user.id, theme).catch((error: unknown) => {
          this.logger.warn(
            error instanceof Error ? error.message : 'Theme update failed',
          );
        });
      });
      client.on('close', () => this.themes.remove(client));
    } catch {
      client.close();
    }
  }
}
