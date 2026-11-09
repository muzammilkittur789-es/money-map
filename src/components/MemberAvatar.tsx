import React from 'react';
import { Image, ImageStyle, StyleProp } from 'react-native';

const AVATAR_IMAGE = require('../../assets/default-avatar.png');

interface MemberAvatarProps {
  size?: number;
  style?: StyleProp<ImageStyle>;
  borderColor?: string;
  borderWidth?: number;
}

export const MemberAvatar: React.FC<MemberAvatarProps> = ({
  size = 32,
  style,
  borderColor,
  borderWidth = 0,
}) => {
  return (
    <Image
      source={AVATAR_IMAGE}
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          borderWidth: borderWidth,
          borderColor: borderColor || 'transparent',
        },
        style,
      ]}
      resizeMode="cover"
    />
  );
};
