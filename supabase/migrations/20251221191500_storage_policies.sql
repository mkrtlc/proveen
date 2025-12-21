-- Create the 'creatives' bucket if it doesn't exist
insert into storage.buckets (id, name, public)
values ('creatives', 'creatives', true)
on conflict (id) do nothing;

-- Policy: Allow authenticated users to upload files to 'creatives' bucket
-- Note: We limit to authenticated users to prevent abuse
create policy "Authenticated users can upload creatives"
on storage.objects for insert
to authenticated
with check ( bucket_id = 'creatives' );

-- Policy: Allow public to view files in 'creatives' bucket
-- Since the bucket is public, we want to allow anyone with the link to view
create policy "Public can view creatives"
on storage.objects for select
to public
using ( bucket_id = 'creatives' );

-- Policy: Allow users to delete their own files (optional but good practice)
create policy "Users can delete own creatives"
on storage.objects for delete
to authenticated
using ( bucket_id = 'creatives' and auth.uid() = owner );
