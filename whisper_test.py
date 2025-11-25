import os
import numpy as np

try:
    import tensorflow  # required in Colab to avoid protobuf compatibility issues
except ImportError:
    pass

import torch
import pandas as pd
import whisper
import torchaudio

from tqdm.notebook import tqdm


DEVICE = "cuda" if torch.cuda.is_available() else "cpu"
model = whisper.load_model("base.en")
print(
    f"Model is {'multilingual' if model.is_multilingual else 'English-only'} "
    f"and has {sum(np.prod(p.shape) for p in model.parameters()):,} parameters."
)


# class LibriSpeech(torch.utils.data.Dataset):
#     """
#     A simple class to wrap LibriSpeech and trim/pad the audio to 30 seconds.
#     It will drop the last few seconds of a very small portion of the utterances.
#     """
#     def __init__(self, split="test-clean", device=DEVICE):
#         self.dataset = torchaudio.datasets.LIBRISPEECH(
#             root=os.path.expanduser("~/.cache"),
#             url=split,
#             download=True,
#         )
#         self.device = device

#     def __len__(self):
#         return len(self.dataset)

#     def __getitem__(self, item):
#         audio, sample_rate, text, _, _, _ = self.dataset[item]
#         assert sample_rate == 16000
#         audio = whisper.pad_or_trim(audio.flatten()).to(self.device)
#         mel = whisper.log_mel_spectrogram(audio)
        
#         return (mel, text)

# dataset = LibriSpeech("test-clean")
# loader = torch.utils.data.DataLoader(dataset, batch_size=16)
# predict without timestamps for short-form transcription
options = whisper.DecodingOptions(language="en", without_timestamps=True)

result=model.transcribe("speaking-sample-1a.wav", language="en")
print(result["text"])

