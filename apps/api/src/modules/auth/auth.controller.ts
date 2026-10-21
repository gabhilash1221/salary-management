import {
  Body,
  Controller,
  Delete,
  Get,
  NotFoundException,
  Patch,
  Post,
  StreamableFile,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { IsEmail, IsIn, IsString, MaxLength, MinLength } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthService } from './auth.service';
import type { AuthUser } from './auth-user';

const AVATAR_BYTES = 2 * 1024 * 1024;

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  @MinLength(1)
  password!: string;
}

export class DisplayNameDto {
  @IsString()
  @MinLength(1)
  @MaxLength(80)
  displayName!: string;
}

export class ThemeDto {
  @IsIn(['day', 'night'])
  theme!: 'day' | 'night';
}

export class ChangePasswordDto {
  @IsString()
  @MinLength(1)
  currentPassword!: string;

  @IsString()
  @MinLength(8)
  @MaxLength(200)
  newPassword!: string;
}

type UploadedImage = {
  buffer?: Buffer;
};

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() body: LoginDto) {
    return this.auth.login(body.email, body.password);
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.profile(user.userId);
  }

  @ApiBearerAuth()
  @Patch('profile')
  updateName(@CurrentUser() user: AuthUser, @Body() body: DisplayNameDto) {
    return this.auth.updateName(user.userId, body.displayName);
  }

  @ApiBearerAuth()
  @Patch('theme')
  updateTheme(@CurrentUser() user: AuthUser, @Body() body: ThemeDto) {
    return this.auth.setTheme(user.userId, body.theme);
  }

  @ApiBearerAuth()
  @Patch('password')
  changePassword(
    @CurrentUser() user: AuthUser,
    @Body() body: ChangePasswordDto,
  ) {
    return this.auth.changePassword(
      user.userId,
      body.currentPassword,
      body.newPassword,
    );
  }

  @ApiBearerAuth()
  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', { limits: { fileSize: AVATAR_BYTES } }),
  )
  uploadAvatar(
    @CurrentUser() user: AuthUser,
    @UploadedFile() file: UploadedImage,
  ) {
    return this.auth.saveAvatar(user.userId, file?.buffer ?? Buffer.alloc(0));
  }

  @ApiBearerAuth()
  @Delete('avatar')
  removeAvatar(@CurrentUser() user: AuthUser) {
    return this.auth.clearAvatar(user.userId);
  }

  @ApiBearerAuth()
  @Get('avatar')
  async avatar(@CurrentUser() user: AuthUser) {
    const file = await this.auth.readAvatar(user.userId);
    if (!file) {
      throw new NotFoundException('No profile photo');
    }
    return new StreamableFile(file.bytes, {
      type: file.type,
      disposition: 'inline',
    });
  }
}
