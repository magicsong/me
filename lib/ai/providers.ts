import {
  customProvider,
} from 'ai';
import { isTestEnvironment } from '../constants';
import {
  artifactModel,
  chatModel,
  reasoningModel,
  titleModel,
} from './models.test';
import { defaultModel } from './models';

export const myProvider = isTestEnvironment
  ? customProvider({
      languageModels: {
        'chat-model': chatModel,
        'chat-model-reasoning': reasoningModel,
        'title-model': titleModel,
        'artifact-model': artifactModel,
      },
    })
  : customProvider({
      languageModels: {
        'chat-model': defaultModel,
        'chat-model-reasoning': defaultModel,
        'title-model': defaultModel,
        'artifact-model': defaultModel,
      },
      imageModels: {
        'small-model': defaultModel,
      },
    });
