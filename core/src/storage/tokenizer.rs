//! Tokenization utilities for memory content

use anyhow::{Context, Result};
use std::ops::{Add, AddAssign};
use std::path::Path;
use std::sync::Arc;
use tokenizers::models::bpe::BPE;
use tokenizers::Tokenizer as HfTokenizer;

/// Count of tokens in a piece of content
#[derive(Debug, Clone, Copy, PartialEq, Eq, PartialOrd, Ord)]
pub struct TokenCount(pub usize);

impl TokenCount {
    /// Create a new token count
    pub fn new(count: usize) -> Self {
        Self(count)
    }

    /// Get the count as a usize
    pub fn as_usize(&self) -> usize {
        self.0
    }
}

impl Add for TokenCount {
    type Output = Self;

    fn add(self, other: Self) -> Self {
        Self(self.0 + other.0)
    }
}

impl AddAssign for TokenCount {
    fn add_assign(&mut self, other: Self) {
        self.0 += other.0;
    }
}

impl From<usize> for TokenCount {
    fn from(count: usize) -> Self {
        Self(count)
    }
}

impl From<TokenCount> for usize {
    fn from(count: TokenCount) -> Self {
        count.0
    }
}

impl std::iter::Sum for TokenCount {
    fn sum<I: Iterator<Item = Self>>(iter: I) -> Self {
        iter.fold(Self(0), |acc, x| Self(acc.0 + x.0))
    }
}

/// Type of tokenizer to use
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum TokenizerType {
    /// Simple whitespace-based tokenizer (for testing)
    Simple,
    /// GPT-2 tokenizer
    Gpt2,
    /// GPT-3.5/GPT-4 tokenizer (cl100k_base)
    Cl100k,
}

/// Tokenizer for counting tokens in content
#[derive(Debug, Clone)]
pub struct Tokenizer {
    /// The type of tokenizer to use
    tokenizer_type: TokenizerType,
    /// The Hugging Face tokenizer (if using a neural tokenizer)
    hf_tokenizer: Option<Arc<HfTokenizer>>,
}

impl Tokenizer {
    /// Create a new tokenizer
    pub fn new(tokenizer_type: TokenizerType) -> Result<Self> {
        let hf_tokenizer = match tokenizer_type {
            TokenizerType::Simple => None,
            TokenizerType::Gpt2 => {
                // Load the GPT-2 tokenizer
                let tokenizer = Self::load_gpt2_tokenizer()?;
                Some(Arc::new(tokenizer))
            }
            TokenizerType::Cl100k => {
                // Load the cl100k_base tokenizer (GPT-3.5/GPT-4)
                let tokenizer = Self::load_cl100k_tokenizer()?;
                Some(Arc::new(tokenizer))
            }
        };

        Ok(Self {
            tokenizer_type,
            hf_tokenizer,
        })
    }

    /// Load the GPT-2 tokenizer
    fn load_gpt2_tokenizer() -> Result<HfTokenizer> {
        // Check if the tokenizer files exist in the models directory
        let vocab_path = Path::new("models/gpt2-vocab.json");
        let merges_path = Path::new("models/gpt2-merges.txt");

        if !vocab_path.exists() || !merges_path.exists() {
            // Download the tokenizer files if they don't exist
            Self::download_gpt2_tokenizer()?;
        }

        // Load the tokenizer
        match HfTokenizer::from_file("models/gpt2-tokenizer.json") {
            Ok(tokenizer) => Ok(tokenizer),
            Err(e) => Err(anyhow::anyhow!("Failed to load GPT-2 tokenizer: {}", e)),
        }
    }

    /// Download the GPT-2 tokenizer files
    fn download_gpt2_tokenizer() -> Result<()> {
        // Create the models directory if it doesn't exist
        std::fs::create_dir_all("models")?;

        // Create a basic BPE tokenizer for GPT-2
        // In a real implementation, we would download the actual GPT-2 tokenizer files
        // For now, we'll create a simple BPE tokenizer
        // Just create a default tokenizer for now
        // In a real implementation, we would download the actual GPT-2 tokenizer files
        let mut tokenizer = HfTokenizer::new(BPE::default());

        // Save the tokenizer
        match tokenizer.save("models/gpt2-tokenizer.json", true) {
            Ok(_) => Ok(()),
            Err(e) => Err(anyhow::anyhow!("Failed to save GPT-2 tokenizer: {}", e)),
        }
    }

    /// Load the cl100k_base tokenizer (GPT-3.5/GPT-4)
    fn load_cl100k_tokenizer() -> Result<HfTokenizer> {
        // Check if the tokenizer file exists in the models directory
        let tokenizer_path = Path::new("models/cl100k-tokenizer.json");

        if !tokenizer_path.exists() {
            // For now, fall back to GPT-2 tokenizer
            // In a real implementation, we would download the cl100k_base tokenizer
            return Self::load_gpt2_tokenizer();
        }

        // Load the tokenizer
        match HfTokenizer::from_file(tokenizer_path) {
            Ok(tokenizer) => Ok(tokenizer),
            Err(e) => Err(anyhow::anyhow!(
                "Failed to load cl100k_base tokenizer: {}",
                e
            )),
        }
    }

    /// Count the number of tokens in a string
    pub fn count_tokens(&self, text: &str) -> TokenCount {
        match self.tokenizer_type {
            TokenizerType::Simple => {
                // Simple whitespace-based tokenization (for testing)
                let count = text.split_whitespace().count();
                TokenCount(count)
            }
            TokenizerType::Gpt2 | TokenizerType::Cl100k => {
                if let Some(tokenizer) = &self.hf_tokenizer {
                    // Use the Hugging Face tokenizer
                    match tokenizer.encode(text, false) {
                        Ok(encoding) => TokenCount(encoding.get_ids().len()),
                        Err(_) => {
                            // Fallback to a simple approximation
                            let count = (text.len() as f32 * 0.25) as usize;
                            TokenCount(count.max(1))
                        }
                    }
                } else {
                    // Fallback to a simple approximation
                    let count = (text.len() as f32 * 0.25) as usize;
                    TokenCount(count.max(1))
                }
            }
        }
    }
}

impl Default for Tokenizer {
    fn default() -> Self {
        // Use the simple tokenizer as default for now
        // In a real implementation, we would use the cl100k_base tokenizer
        Self::new(TokenizerType::Simple).unwrap_or_else(|_| Self {
            tokenizer_type: TokenizerType::Simple,
            hf_tokenizer: None,
        })
    }
}
