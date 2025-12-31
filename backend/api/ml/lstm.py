import torch
import torch.nn as nn

class LSTMWeatherModel(nn.Module):
    def __init__(self, input_size=4, hidden_size=64, output_size=3, num_layers=3, dropout=0.2):
        """
        State-of-the-Art Bi-Directional Stacked LSTM for Weather Prediction.
        
        Architecture:
        - Input Layer: 4 Features
        - Hidden Layers: 3 Stacked Bi-LSTM Layers (64 units each)
        - Regularization: Dropout (0.2) to prevent overfitting
        - Output Layer: Fully Connected -> ReLU
        
        :param input_size: Number of features
        :param hidden_size: Number of LSTM units per direction
        :param output_size: Forecasting horizon
        :param num_layers: Number of stacked layers
        :param dropout: Dropout probability
        """
        super(LSTMWeatherModel, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        # Bi-Directional LSTM
        # batch_first=True expects input: (batch, seq, feature)
        self.lstm = nn.LSTM(
            input_size, 
            hidden_size, 
            num_layers, 
            batch_first=True, 
            bidirectional=True,
            dropout=dropout
        )
        
        # Fully Connected Layer
        # Input is hidden_size * 2 (because bidirectional)
        self.fc = nn.Linear(hidden_size * 2, output_size)
        
        self.relu = nn.ReLU()

    def forward(self, x):
        # Initialize hidden/cell states for Bi-Directional (num_layers * 2)
        h0 = torch.zeros(self.num_layers * 2, x.size(0), self.hidden_size).to(x.device)
        c0 = torch.zeros(self.num_layers * 2, x.size(0), self.hidden_size).to(x.device)
        
        # Forward pass
        # out shape: (batch, seq, hidden_size * 2)
        out, _ = self.lstm(x, (h0, c0))
        
        # Decode the last time step
        # Take the output of the last sequence step
        out = self.fc(out[:, -1, :])
        
        # Ensure non-negative rainfall
        out = self.relu(out)
        return out
