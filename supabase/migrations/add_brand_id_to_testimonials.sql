-- Add brand_id column to testimonials table
-- This allows manual testimonials to be linked to brands, similar to scraped_reviews

ALTER TABLE testimonials 
ADD COLUMN brand_id uuid REFERENCES brands(id) ON DELETE SET NULL;

-- Create index for better query performance
CREATE INDEX IF NOT EXISTS idx_testimonials_brand_id ON testimonials(brand_id);

-- Add comment explaining the column
COMMENT ON COLUMN testimonials.brand_id IS 'Links manual testimonials to brands, similar to how scraped_reviews are linked via review_sources';
